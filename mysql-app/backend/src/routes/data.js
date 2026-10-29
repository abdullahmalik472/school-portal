// Mounted at /api and already behind `authenticate` (see server.js)
const router = require('express').Router()
const db = require('../db/repo')
const { authorize } = require('../middleware/auth')

// every logged-in role
router.get('/courses', async (req, res) => res.json({ courses: await db.listCourses() }))

// teacher + admin only
router.post('/courses', authorize('teacher', 'admin'), async (req, res) => {
  const { title } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })
  res.status(201).json({ course: await db.createCourse({ title, teacher_id: req.user.id }) })
})

// admin only
router.get('/users', authorize('admin'), async (req, res) => res.json({ users: await db.listUsers() }))

module.exports = router
