const express = require('express')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { authenticate, signAuthToken } = require('../middleware/auth')

const router = express.Router()

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }
}

function isValidEmail(email) {
  return typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// Public registration always creates a customer; clients cannot assign their own role.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' })
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 72 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id')
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
    })

    const token = signAuthToken(user)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: publicUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' })
    }
    if (error.statusCode === 500) {
      return res.status(500).json({ success: false, message: 'Authentication service is not configured' })
    }
    console.error('Registration error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to register account' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0 || password.length > 72) {
      return res.status(400).json({ success: false, message: 'Valid email and password are required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
    if (!user || !user.isActive || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: signAuthToken(user),
      user: publicUser(user),
    })
  } catch (error) {
    if (error.statusCode === 500) {
      return res.status(500).json({ success: false, message: 'Authentication service is not configured' })
    }
    console.error('Login error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to log in' })
  }
})

router.get('/me', authenticate, (req, res) => {
  res.status(200).json({ success: true, user: req.user })
})

module.exports = router
