
const express = require('express')
const mongoose = require('mongoose')
const Plant = require('../models/Plant')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

// GET plants with search and filters
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice } = req.query
    const filter = { isActive: { $ne: false }, moderationStatus: 'Approved' }

    // Reject repeated or non-string query parameters instead of crashing on .trim().
    const queryValues = { search, category, minPrice, maxPrice }
    for (const [key, value] of Object.entries(queryValues)) {
      if (value !== undefined && typeof value !== 'string') {
        return res.status(400).json({
          success: false,
          message: key + ' must be a single string value',
        })
      }
    }

    if (search?.trim()) {
      filter.name = {
        $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      }
    }

    if (category?.trim()) {
      filter.category = {
        $regex: '^' + category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
        $options: 'i',
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const min = minPrice === undefined ? undefined : Number(minPrice)
      const max = maxPrice === undefined ? undefined : Number(maxPrice)

      if (
        minPrice !== undefined &&
        (minPrice.trim() === '' || !Number.isFinite(min))
      ) {
        return res.status(400).json({
          success: false,
          message: 'minPrice must be a valid number',
        })
      }

      if (
        maxPrice !== undefined &&
        (maxPrice.trim() === '' || !Number.isFinite(max))
      ) {
        return res.status(400).json({
          success: false,
          message: 'maxPrice must be a valid number',
        })
      }

      if (
        (min !== undefined && min < 0) ||
        (max !== undefined && max < 0) ||
        (min !== undefined && max !== undefined && min > max)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Price range is invalid',
        })
      }

      filter.price = {}
      if (min !== undefined) filter.price.$gte = min
      if (max !== undefined) filter.price.$lte = max
    }

    const plants = await Plant.find(filter).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: plants.length,
      data: plants,
    })
  } catch (error) {
    console.error('Get plants error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve plants',
    })
  }
})

// GET one plant by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plant ID',
      })
    }

    const plant = await Plant.findOne({ _id: req.params.id, isActive: { $ne: false }, moderationStatus: 'Approved' })

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found',
      })
    }

    res.status(200).json({ success: true, data: plant })
  } catch (error) {
    console.error('Get plant error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve plant',
    })
  }
})



module.exports = router
