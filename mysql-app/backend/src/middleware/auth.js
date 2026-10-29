const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config')

// Authentication: "who are you?"
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  try {
    req.user = jwt.verify(token, jwtSecret)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or missing token' })
  }
}

// Authorization: "are you allowed here?"
const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' })

module.exports = { authenticate, authorize }
