
const router = require('express').Router()
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const db = require('../db/repo')
const { authorize } = require('../middleware/auth')

// Every logged-in role
router.get('/courses', async (req, res) => {
  res.json({ courses: await db.listCourses() })
})

// Teacher + admin only
router.post('/courses', authorize('teacher', 'admin'), async (req, res) => {
  const { title } = req.body

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  const course = await db.createCourse({
    title,
    teacher_id: req.user.id,
  })

  res.status(201).json({ course })
})

// Admin only: list all users
router.get('/users', authorize('admin'), async (req, res) => {
  res.json({ users: await db.listUsers() })
})

// Admin only: create a user
router.post('/users', authorize('admin'), async (req, res) => {
  const { name, email: rawEmail, role, organization_id, organizationId } = req.body

  if (!name || !rawEmail || !role) {
    return res.status(400).json({
      error: 'Name, email and role are required',
    })
  }

  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const email = String(rawEmail).trim().toLowerCase()
  const cleanName = String(name).trim()
  const orgId = organization_id ?? organizationId

  if (!cleanName || !email || !orgId) {
    return res.status(400).json({
      error: 'Name, email and organization are required',
    })
  }

  if (await db.findUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  // Generate a temporary password
  const password = crypto.randomBytes(12).toString('base64url')
  const password_hash = await bcrypt.hash(password, 10)

  try {
    const user = await db.createUser({
      name: cleanName,
      email,
      role,
      organization_id: Number(orgId),
      password_hash,
    })

    res.status(201).json({
      created: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
        reg_id: user.reg_id,
      },
      credentials: {
        email,
        password,
      },
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Email or registration ID already exists',
      })
    }

    throw error
  }
})

// Admin only: create an organization
router.post('/organizations', authorize('admin'), async (req, res) => {
  const { code, name } = req.body

  if (!code || !name) {
    return res.status(400).json({
      error: 'Organization code and name are required',
    })
  }

  try {
    const organization = await db.createOrganization({ code, name })

    res.status(201).json({
      ok: true,
      organization,
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Organization code already exists',
      })
    }

    return res.status(400).json({ error: error.message })
  }
})

module.exports = router
