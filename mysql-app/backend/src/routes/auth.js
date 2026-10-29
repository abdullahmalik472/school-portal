const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db/repo')
const { jwtSecret, adminCodes } = require('../config')
const { authenticate } = require('../middleware/auth')

const ROLES = ['student', 'teacher', 'admin']
const publicUser = ({ id, name, email, role }) => ({ id, name, email, role })
const sign = (u) => jwt.sign({ id: u.id, role: u.role }, jwtSecret, { expiresIn: '1d' })

router.post('/register', async (req, res) => {
  const { name, email, password, role = 'student', adminCode } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' })
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' })
  if (role === 'admin' && !adminCodes.includes(adminCode)) return res.status(403).json({ error: 'Wrong admin code' })
  if (await db.findUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' })

  const password_hash = await bcrypt.hash(password, 10)
  let user
  try {
    user = await db.createUser({ name, email, role, password_hash })
  } catch (err) {
    // two people registering the same email at the same moment: the UNIQUE index catches it
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered' })
    throw err
  }
  res.status(201).json({ user: publicUser(user) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })

  const user = await db.findUserByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Wrong email or password' })

  res.json({ token: sign(user), user: publicUser(user) })
})

router.get('/me', authenticate, async (req, res) => {
  const user = await db.findUserById(req.user.id)
  if (!user) return res.status(401).json({ error: 'User no longer exists' })
  res.json({ user: publicUser(user) })
})

// Profile + token status (iat/exp are unix seconds, added automatically by jwt.sign)
router.get('/profile', authenticate, async (req, res) => {
  const user = await db.findUserById(req.user.id)
  if (!user) return res.status(401).json({ error: 'User no longer exists' })
  res.json({
    user: { ...publicUser(user), created_at: user.created_at },
    token: { issuedAt: req.user.iat, expiresAt: req.user.exp },
  })
})

module.exports = router
