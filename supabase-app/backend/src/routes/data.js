
const router = require('express').Router()
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const db = require('../db/repo')
const { authorize } = require('../middleware/auth')

// All logged-in users can see courses from their organization.
// Admin can see courses across all organizations.
router.get('/courses', async (req, res, next) => {
  try {
    const courses =
      req.user.role === 'admin'
        ? await db.listCoursesForAdmin()
        : await db.listCourses(req.user.organization_id)

    res.json({ courses })
  } catch (err) {
    next(err)
  }
})

// Teacher and admin can create courses.
router.post('/courses', authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { title } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    if (!req.user.organization_id) {
      return res.status(400).json({
        error: 'User is not assigned to an organization',
      })
    }

    const course = await db.createCourse({
      title,
      teacher_id: req.user.id,
      organization_id: req.user.organization_id,
    })

    res.status(201).json({ course })
  } catch (err) {
    next(err)
  }
})

// Admin: list all users.
router.get('/users', authorize('admin'), async (req, res, next) => {
  try {
    res.json({ users: await db.listUsers() })
  } catch (err) {
    next(err)
  }
})

// Admin: list organizations.
router.get('/organizations', authorize('admin'), async (req, res, next) => {
  try {
    res.json({ organizations: await db.listOrganizations() })
  } catch (err) {
    next(err)
  }
})

// Admin: create organization.
router.post('/organizations', authorize('admin'), async (req, res, next) => {
  try {
    const { name, code } = req.body

    if (!name || !code) {
      return res.status(400).json({
        error: 'Organization name and code are required',
      })
    }

    if (!/^[A-Z0-9]{2,6}$/i.test(code)) {
      return res.status(400).json({
        error: 'Organization code must be 2-6 letters or numbers',
      })
    }

    const organization = await db.createOrganization({
      name: name.trim(),
      code: code.trim(),
    })

    res.status(201).json({ organization })
  } catch (err) {
    next(err)
  }
})

// Admin: create a user and generate a temporary password.
router.post('/users', authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, role, organization_id } = req.body

    if (!name || !email || !role || !organization_id) {
      return res.status(400).json({
        error: 'Name, email, role and organization are required',
      })
    }

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({
        error: 'Admin can create student or teacher accounts only',
      })
    }

    const organizations = await db.listOrganizations()
    const organization = organizations.find(
      (org) => String(org.id) === String(organization_id)
    )

    if (!organization) {
      return res.status(400).json({
        error: 'Invalid or inactive organization',
      })
    }

    const existingUser = await db.findUserByEmail(email)

    if (
      existingUser &&
      String(existingUser.organization_id) === String(organization_id)
    ) {
      return res.status(409).json({
        error: 'Email already registered in this organization',
      })
    }

    const temporaryPassword = crypto.randomBytes(12).toString('base64url')
    const password_hash = await bcrypt.hash(temporaryPassword, 10)

    const user = await db.createUser({
      organization_id: Number(organization_id),
      name,
      email,
      password_hash,
      role,
    })

    res.status(201).json({
      user,
      credentials: {
        email,
        password: temporaryPassword,
      },
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
