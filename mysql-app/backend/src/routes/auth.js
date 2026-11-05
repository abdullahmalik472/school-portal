
const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db/repo')
const { jwtSecret, adminCodes } = require('../config')
const { authenticate } = require('../middleware/auth')
const {
  reservePassword,
  finalizePassword,
  releasePassword,
} = require('../services/passwordRegistry')
const ROLES = ['student', 'teacher', 'admin']

// Only expose safe user information to the frontend
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization_id: user.organization_id,
  organization_name: user.organization_name,
  organization_code: user.organization_code,
  reg_id: user.reg_id,
})

// Generate JWT token
const sign = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      organization_id: user.organization_id
    },
    jwtSecret,
    { expiresIn: '1d' }
  )

// ========================================
// REGISTER
// ========================================

router.post('/register', async (req, res) => {
  const {
    name,
    email: rawEmail,
    password,
    role = 'student',
    adminCode,
  } = req.body

  const organizationId =
    req.body.organizationId ?? req.body.organization_id

  if (
    typeof name !== 'string' ||
    typeof rawEmail !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !rawEmail.trim() ||
    !password
  ) {
    return res.status(400).json({
      error: 'Name, email and password are required',
    })
  }

  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  if (role === 'admin' && !adminCodes.includes(adminCode)) {
    return res.status(403).json({ error: 'Wrong admin code' })
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters',
    })
  }

  if (
    organizationId === undefined ||
    organizationId === null ||
    String(organizationId).trim() === ''
  ) {
    return res.status(400).json({
      error: 'Please select an organization',
    })
  }

  const cleanName = name.trim()
  const email = rawEmail.trim().toLowerCase()

  let reservationId = null
  let accountCreated = false

  try {
    const organizations = await db.listOrganizations()

    const organization = organizations.find(
      (org) => String(org.id) === String(organizationId)
    )

    if (!organization) {
      return res.status(400).json({
        error: 'Invalid or inactive organization',
      })
    }

    // Reserve password globally before creating the account.
    const reservation = await reservePassword(password)

    if (!reservation.reserved) {
      return res.status(409).json({
        error: 'This password is already taken. Please choose another password.',
      })
    }

    reservationId = reservation.reservationId

    const password_hash = await bcrypt.hash(password, 10)

    const user = await db.createUser({
      name: cleanName,
      email,
      role,
      password_hash,
      organization_id: organization.id,
    })

    accountCreated = true

    // Permanently mark the password as used.
    try {
      await finalizePassword({
        reservationId,
        backend: 'mysql',
        userId: user.id,
        organizationId: organization.id,
      })
    } catch (registryError) {
      // Reservation remains in the central registry.
      // This still blocks reuse of the password.
      console.error(
        'Password registry finalization needs recovery:',
        registryError.message
      )
    }

    const completeUser = await db.findUserById(user.id)

    return res.status(201).json({
      message: 'Registration successful',
      user: publicUser(completeUser || user),
    })
  } catch (err) {
    if (reservationId && !accountCreated) {
      try {
        await releasePassword(reservationId)
      } catch (releaseError) {
        console.error(
          'Password reservation release failed:',
          releaseError.message
        )
      }
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Email already registered in this organization',
      })
    }

    console.error('Registration error:', err)
    return res.status(500).json({
      error: 'Registration failed. Please try again.',
    })
  }
})
// Find organizations where this email has accounts
router.post('/login-organizations', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const organizations = await db.listOrganizationsForEmail(email)

  return res.json({ organizations })
})
// ========================================
// LOGIN
// ========================================
router.post('/login', async (req, res, next) => {
  try {
    const { email: rawEmail, password, organization_id } = req.body

    if (!rawEmail || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      })
    }

    const email = String(rawEmail).trim().toLowerCase()
    const users = await db.findUsersByEmail(email)

    if (!users.length) {
      return res.status(401).json({
        error: 'Wrong email or password',
      })
    }

    const organizationIds = [
      ...new Set(users.map((user) => String(user.organization_id))),
    ]

    // Multiple organizations require an explicit selection.
    if (!organization_id && organizationIds.length > 1) {
      return res.status(400).json({
        error: 'Please select your organization',
      })
    }

    const selectedOrganizationId =
      organization_id || organizationIds[0]

    const matchingUsers = users.filter(
      (user) =>
        String(user.organization_id) === String(selectedOrganizationId)
    )

    let matchedUser = null

    for (const user of matchingUsers) {
      if (await bcrypt.compare(password, user.password_hash)) {
        matchedUser = user
        break
      }
    }

    if (!matchedUser) {
      return res.status(401).json({
        error: 'Wrong email or password',
      })
    }

    return res.json({
      token: sign(matchedUser),
      user: publicUser(matchedUser),
    })
  } catch (err) {
    next(err)
  }
})
// ========================================
// CURRENT USER
// ========================================
router.get('/me', authenticate, async (req, res) => {
  const user = await db.findUserById(req.user.id)

  if (!user) {
    return res.status(401).json({
      error: 'User no longer exists'
    })
  }

  return res.json({
    user: publicUser(user)
  })
})

// ========================================
// PROFILE + TOKEN STATUS
// ========================================
router.get('/profile', authenticate, async (req, res) => {
  const user = await db.findUserById(req.user.id)

  if (!user) {
    return res.status(401).json({
      error: 'User no longer exists'
    })
  }

  return res.json({
    user: {
      ...publicUser(user),
      created_at: user.created_at
    },
    token: {
      issuedAt: req.user.iat,
      expiresAt: req.user.exp
    }
  })
})

module.exports = router
