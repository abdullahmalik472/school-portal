require('dotenv').config({ quiet: true }) // must stay first: loads .env before other files read it
const express = require('express')
const { port, jwtSecret } = require('./config')
const { authenticate } = require('./middleware/auth')

if (!jwtSecret) console.error('!! JWT_SECRET is missing. Did you create .env from .env.example (and restart)?')

const app = express()
app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))      // public, to test the deploy

app.use('/auth', require('./routes/auth'))                    // public
app.use('/api', authenticate, require('./routes/data'))       // needs a valid token

app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err.code || '', err.message) // the REAL reason
  res.status(500).json({ error: 'Server error' })
})

app.listen(port, () => console.log(`API running on port ${port}  (http://localhost:${port})`))
