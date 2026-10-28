const express = require('express')
const mongoose = require('mongoose')
const Plant = require('../models/Plant')
const Order = require('../models/Order')
const User = require('../models/User')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate, authorize('admin'))

function validText(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
}

function validatePlant(body, partial = false) {
  const errors = []
  const requiredText = [
    ['name', 2, 100],
    ['category', 2, 60],
    ['description', 5, 2000],
  ]

  for (const [field, min, max] of requiredText) {
    if (body[field] === undefined && partial) continue
    if (!validText(body[field], min, max)) errors.push(`${field} must be between ${min} and ${max} characters`)
  }

  if (body.price !== undefined || !partial) {
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
      errors.push('price must be a non-negative number')
    }
  }

  if (body.stock !== undefined || !partial) {
    if (!Number.isInteger(body.stock) || body.stock < 0 || body.stock > 1000000) {
      errors.push('stock must be a whole number between 0 and 1000000')
    }
  }

  if (body.imageUrl !== undefined && (typeof body.imageUrl !== 'string' || body.imageUrl.length > 2000)) {
    errors.push('imageUrl must be a string of at most 2000 characters')
  }
  if (body.sunlight !== undefined && (typeof body.sunlight !== 'string' || body.sunlight.length > 100)) {
    errors.push('sunlight must be a string of at most 100 characters')
  }

  return errors
}

router.get('/dashboard', async (req, res) => {
  try {
    const [plantCount, orderCount, customerCount, pendingOrders, recentOrders, lowStockCount] = await Promise.all([
      Plant.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer', isActive: true }),
      Order.countDocuments({ status: 'Pending' }),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Plant.countDocuments({ stock: { $lte: 5 } }),
    ])

    return res.json({
      success: true,
      data: {
        plantCount,
        orderCount,
        customerCount,
        pendingOrders,
        lowStockCount,
        recentOrders,
      },
    })
  } catch (error) {
    console.error('Admin dashboard error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to load dashboard summary' })
  }
})

router.get('/plants', async (req, res) => {
  try {
    const plants = await Plant.find().sort({ createdAt: -1 }).lean()
    return res.json({ success: true, count: plants.length, data: plants })
  } catch (error) {
    console.error('Admin plants error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to load plants' })
  }
})

router.post('/plants', async (req, res) => {
  try {
    const body = req.body || {}
    const errors = validatePlant(body)
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors })

    const plant = await Plant.create({
      name: body.name.trim(),
      category: body.category.trim(),
      price: body.price,
      stock: body.stock,
      description: body.description.trim(),
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '',
      sunlight: typeof body.sunlight === 'string' && body.sunlight.trim() ? body.sunlight.trim() : 'Not specified',
    })
    return res.status(201).json({ success: true, message: 'Plant created', data: plant })
  } catch (error) {
    console.error('Admin create plant error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to create plant' })
  }
})

router.patch('/plants/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid plant ID' })
    }
    const body = req.body || {}
    const errors = validatePlant(body, true)
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors })

    const allowed = ['name', 'category', 'price', 'stock', 'description', 'imageUrl', 'sunlight']
    const updates = {}
    for (const field of allowed) {
      if (body[field] !== undefined) {
        updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field]
      }
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'Provide at least one supported plant field' })
    }

    const plant = await Plant.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
    if (!plant) return res.status(404).json({ success: false, message: 'Plant not found' })
    return res.json({ success: true, message: 'Plant updated', data: plant })
  } catch (error) {
    console.error('Admin update plant error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to update plant' })
  }
})

router.delete('/plants/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid plant ID' })
    }
    const plant = await Plant.findByIdAndDelete(req.params.id)
    if (!plant) return res.status(404).json({ success: false, message: 'Plant not found' })
    return res.json({ success: true, message: 'Plant deleted' })
  } catch (error) {
    console.error('Admin delete plant error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to delete plant' })
  }
})

router.get('/orders', async (req, res) => {
  try {
    const allowedStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled']
    const filter = {}
    if (req.query.status !== undefined) {
      if (typeof req.query.status !== 'string' || !allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Invalid order status filter' })
      }
      filter.status = req.query.status
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).lean()
    return res.json({ success: true, count: orders.length, data: orders })
  } catch (error) {
    console.error('Admin orders error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to load orders' })
  }
})

router.patch('/orders/:id/status', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' })
    }
    const allowedStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled']
    const { status } = req.body || {}
    if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' })
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true, runValidators: true })
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    return res.json({ success: true, message: 'Order status updated', data: order })
  } catch (error) {
    console.error('Admin order status error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to update order status' })
  }
})

module.exports = router
