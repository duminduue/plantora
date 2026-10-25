
const express = require('express')
const mongoose = require('mongoose')
const Plant = require('../models/Plant')

const router = express.Router()

// GET plants with search and filters
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice } = req.query
    const filter = {}

    if (search?.trim()) {
      filter.name = {
        $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      }
    }

    if (category?.trim()) {
      filter.category = {
        $regex: `^${category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const min = minPrice === undefined ? 0 : Number(minPrice)
      const max = maxPrice === undefined ? Infinity : Number(maxPrice)

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

      if (min < 0 || max < 0 || min > max) {
        return res.status(400).json({
          success: false,
          message: 'Price range is invalid',
        })
      }

      filter.price = { $gte: min, $lte: max }
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

    const plant = await Plant.findById(req.params.id)

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


/* PATCH one plant by ID */
router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plant ID',
      })
    }

    const allowedFields = ['imageUrl']
    const updates = {}

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No supported fields provided',
      })
    }

    const plant = await Plant.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Plant updated successfully',
      data: plant,
    })
  } catch (error) {
    console.error('Update plant error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to update plant',
    })
  }
})


module.exports = router
