const express = require('express')
const mongoose = require('mongoose')
const Plant = require('../models/Plant')
const Order = require('../models/Order')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate, authorize('seller'))

function validatePlant(body, partial = false) {
  const errors = []
  for (const [field, min, max] of [['name', 2, 100], ['category', 2, 60], ['description', 5, 2000]]) {
    if (body[field] === undefined && partial) continue
    if (typeof body[field] !== 'string' || body[field].trim().length < min || body[field].trim().length > max) errors.push(`${field} must be between ${min} and ${max} characters`)
  }
  if (body.price !== undefined || !partial) if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) errors.push('price must be a non-negative number')
  if (body.stock !== undefined || !partial) if (!Number.isInteger(body.stock) || body.stock < 0 || body.stock > 1000000) errors.push('stock must be a whole number between 0 and 1000000')
  if (body.imageUrl !== undefined && (typeof body.imageUrl !== 'string' || body.imageUrl.length > 2000)) errors.push('imageUrl must be a string of at most 2000 characters')
  if (body.sunlight !== undefined && (typeof body.sunlight !== 'string' || body.sunlight.length > 100)) errors.push('sunlight must be a string of at most 100 characters')
  return errors
}

router.get('/plants', async (req, res) => {
  try {
    const plants = await Plant.find({ seller: req.user.id }).sort({ createdAt: -1 }).lean()
    res.json({ success: true, count: plants.length, data: plants })
  } catch (error) {
    console.error('Seller plants error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to load seller listings' })
  }
})

router.post('/plants', async (req, res) => {
  try {
    const body = req.body || {}
    const errors = validatePlant(body)
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors })
    const plant = await Plant.create({
      seller: req.user.id, isActive: false, moderationStatus: 'Pending',
      name: body.name.trim(), category: body.category.trim(), price: body.price, stock: body.stock,
      description: body.description.trim(), imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '',
      sunlight: typeof body.sunlight === 'string' && body.sunlight.trim() ? body.sunlight.trim() : 'Not specified',
    })
    res.status(201).json({ success: true, message: 'Listing submitted for admin review', data: plant })
  } catch (error) {
    console.error('Seller create plant error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to create seller listing' })
  }
})

router.patch('/plants/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid plant ID' })
    const body = req.body || {}
    const errors = validatePlant(body, true)
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors })
    const allowed = ['name', 'category', 'price', 'stock', 'description', 'imageUrl', 'sunlight', 'isActive']
    const updates = {}
    for (const field of allowed) if (body[field] !== undefined) {
      if (field === 'isActive' && typeof body[field] !== 'boolean') return res.status(400).json({ success: false, message: 'isActive must be a boolean' })
      updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field]
    }
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'Provide listing changes' })
    const plant = await Plant.findOne({ _id: req.params.id, seller: req.user.id })
    if (!plant) return res.status(404).json({ success: false, message: 'Listing not found' })
    if (updates.name || updates.category || updates.price !== undefined || updates.description || updates.imageUrl !== undefined) {
      updates.moderationStatus = 'Pending'
      updates.isActive = false
    }
    Object.assign(plant, updates)
    await plant.save()
    res.json({ success: true, message: 'Listing updated. Content changes require admin review.', data: plant })
  } catch (error) {
    console.error('Seller update plant error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to update seller listing' })
  }
})

router.delete('/plants/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid plant ID' })
    const plant = await Plant.findOneAndUpdate({ _id: req.params.id, seller: req.user.id }, { $set: { isActive: false } }, { new: true })
    if (!plant) return res.status(404).json({ success: false, message: 'Listing not found' })
    res.json({ success: true, message: 'Listing deactivated', data: plant })
  } catch (error) {
    console.error('Seller deactivate listing error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to deactivate listing' })
  }
})

router.get('/orders', async (req, res) => {
  try {
    const plants = await Plant.find({ seller: req.user.id }).select('_id name').lean()
    const plantIds = plants.map((plant) => plant._id)
    const orders = await Order.find({ 'items.plant': { $in: plantIds } }).sort({ createdAt: -1 }).limit(200).lean()
    const sellerOrders = orders.map((order) => ({
      ...order,
      items: order.items.filter((item) => plantIds.some((id) => id.toString() === item.plant.toString())),
    }))
    res.json({ success: true, count: sellerOrders.length, data: sellerOrders })
  } catch (error) {
    console.error('Seller orders error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to load seller orders' })
  }
})

module.exports = router
