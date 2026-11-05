require('dotenv').config({ quiet: true }) // must stay first: loads .env before other files read it
const express = require('express')
const { port, jwtSecret } = require('./config')
const { authenticate } = require('./middleware/auth')
const cors = require('cors')
if (!jwtSecret) console.error('!! JWT_SECRET is missing. Did you create .env from .env.example (and restart)?')

const app = express()
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
const db = require('./db/repo')

// Public: active organizations for registration
app.get('/api/organizations', async (req, res, next) => {
  try {
    const organizations = await db.listOrganizations()
    res.json({ organizations })
  } catch (err) {
    next(err)
  }
})
app.get('/health', (req, res) => res.json({ ok: true }))      // public, to test the deploy

app.use('/auth', require('./routes/auth'))                    // public
app.use('/api', authenticate, require('./routes/data'))       // needs a valid token

app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err.code || '', err.message) // the REAL reason
  res.status(500).json({ error: 'Server error' })
})

app.listen(port, () => console.log(`API running on port ${port}  (http://localhost:${port})`))
