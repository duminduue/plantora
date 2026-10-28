const express = require('express')
const mongoose = require('mongoose')
const Order = require('../models/Order')
const Plant = require('../models/Plant')
const StockMovement = require('../models/StockMovement')

const router = express.Router()

function validEmail(email) {
  return typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

router.post('/', async (req, res) => {
  const reservedStock = []
  let orderCreated = false

  try {
    const body = req.body || {}
    const { customerName, email, phone, address, items } = body

    if (typeof customerName !== 'string' || customerName.trim().length < 2 || customerName.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters' })
    }
    if (!validEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' })
    }
    if (typeof phone !== 'string' || !/^[+()\d\s-]{9,20}$/.test(phone.trim()) || phone.replace(/\D/g, '').length < 9 || phone.replace(/\D/g, '').length > 15) {
      return res.status(400).json({ success: false, message: 'Enter a valid phone number (9 to 15 digits)' })
    }
    if (typeof address !== 'string' || address.trim().length < 8 || address.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Address must be between 8 and 500 characters' })
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
      return res.status(400).json({ success: false, message: 'Order must contain between 1 and 50 items' })
    }

    const requested = new Map()
    for (const item of items) {
      if (!item || typeof item.plantId !== 'string' || !mongoose.isValidObjectId(item.plantId)) {
        return res.status(400).json({ success: false, message: 'Each item must contain a valid plantId' })
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return res.status(400).json({ success: false, message: 'Quantity must be an integer between 1 and 99' })
      }
      const key = item.plantId
      requested.set(key, (requested.get(key) || 0) + item.quantity)
      if (requested.get(key) > 99) {
        return res.status(400).json({ success: false, message: 'Maximum quantity per plant is 99' })
      }
    }

    const plantIds = [...requested.keys()]
    const plants = await Plant.find({ _id: { $in: plantIds } })
    if (plants.length !== plantIds.length) {
      return res.status(400).json({ success: false, message: 'One or more plants are unavailable' })
    }

    // Older plant documents may not have a stock field yet. Initialize them
    // with the model's legacy-safe default before applying atomic reservations.
    await Plant.updateMany(
      { _id: { $in: plantIds }, stock: { $exists: false } },
      { $set: { stock: 100 } }
    )

    const byId = new Map(plants.map((plant) => [plant._id.toString(), plant]))
    const orderItems = []

    // Reserve inventory atomically so concurrent checkouts cannot oversell.
    for (const plantId of plantIds) {
      const quantity = requested.get(plantId)
      const reservedPlant = await Plant.findOneAndUpdate(
        { _id: plantId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      )

      if (!reservedPlant) {
        for (const reservation of reservedStock) {
          await Plant.updateOne(
            { _id: reservation.plantId },
            { $inc: { stock: reservation.quantity } }
          )
        }
        reservedStock.length = 0
        return res.status(409).json({
          success: false,
          message: 'Not enough stock available for one or more plants',
        })
      }

      reservedStock.push({ plantId, quantity })
      const plant = byId.get(plantId)
      orderItems.push({
        plant: plant._id,
        name: plant.name,
        unitPrice: plant.price,
        quantity,
      })
    }
    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const orderNumber = `PA-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const order = await Order.create({
      orderNumber,
      customerName: customerName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      items: orderItems,
      subtotal,
      status: 'Pending',
    })
    orderCreated = true
    reservedStock.length = 0

    try {
      await StockMovement.insertMany(orderItems.map((item) => {
        const plant = byId.get(item.plant.toString())
        const stockAfter = plant.stock - item.quantity
        return {
          plant: item.plant,
          plantName: item.name,
          type: 'Sale',
          quantityChange: -item.quantity,
          stockBefore: stockAfter + item.quantity,
          stockAfter,
          orderNumber,
          note: `Order ${orderNumber}`,
        }
      }))
    } catch (historyError) {
      // The order and stock reservation are already committed; keep checkout successful
      // if history logging has a transient failure.
      console.error('Stock history logging error:', historyError.message)
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully. Payment is not collected online.',
      data: order,
    })
  } catch (error) {
    if (!orderCreated && reservedStock.length) {
      for (const reservation of reservedStock) {
        try {
          await Plant.updateOne(
            { _id: reservation.plantId },
            { $inc: { stock: reservation.quantity } }
          )
        } catch (rollbackError) {
          console.error('Stock rollback error:', rollbackError.message)
        }
      }
    }
    console.error('Create order error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to place order' })
  }
})

module.exports = router
