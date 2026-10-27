const jwt = require('jsonwebtoken')
const User = require('../models/User')

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    const error = new Error('JWT_SECRET must be configured with at least 32 characters')
    error.statusCode = 500
    throw error
  }
  return secret
}

function signAuthToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    getJwtSecret(),
    { expiresIn: '1d', issuer: 'plantorai-api', audience: 'plantorai-client' }
  )
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }

  try {
    const token = header.slice(7).trim()
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: 'plantorai-api',
      audience: 'plantorai-client',
    })
    const user = await User.findById(payload.sub)

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive account' })
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }
    next()
  } catch (error) {
    if (error.statusCode === 500) {
      return res.status(500).json({ success: false, message: 'Authentication service is not configured' })
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' })
    }
    next()
  }
}

module.exports = { authenticate, authorize, signAuthToken }
