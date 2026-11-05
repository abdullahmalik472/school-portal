
require('dotenv').config({ quiet: true })

const express = require('express')
const cors = require('cors')

const { port, jwtSecret } = require('./config')
const { authenticate } = require('./middleware/auth')
const { startScheduler } = require('./jobs/scheduler')

if (!jwtSecret) {
  console.error('JWT_SECRET is missing')
}

const app = express()

// Allow local Next.js frontend on any localhost port
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    ) {
      return callback(null, true)
    }

    return callback(new Error('Not allowed by CORS'))
  }
}))

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'MySQL backend is running' })
})

const db = require('./db/repo')

app.get('/api/organizations', async (req, res, next) => {
  try {
    const organizations = await db.listOrganizations()
    res.json({ organizations })
  } catch (err) {
    console.error('[GET /api/organizations]', err.message)
    next(err)
  }
})

app.use('/auth', require('./routes/auth'))
app.use('/cron', require('./routes/cron'))
app.use('/api', authenticate, require('./routes/data'))

app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Server error' })
})

app.listen(port, () => {
  console.log(`API running on port ${port}`)
  console.log(`http://localhost:${port}`)

  startScheduler()
})
