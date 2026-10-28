
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const path = require('path')
const plantRoutes = require('./routes/plantRoutes')
const authRoutes = require('./routes/authRoutes')
const orderRoutes = require('./routes/orderRoutes')
const adminRoutes = require('./routes/adminRoutes')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '10kb' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/plants', plantRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/admin', adminRoutes)

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PlantorAI API is running 🌿',
  })
})

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'PlantorAI API',
    status: 'healthy',
    database: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected',
  })
})

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from server/.env')
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })

    console.log('PlantorAI MongoDB connected successfully 🌿')

    app.listen(PORT, () => {
      console.log(`PlantorAI API running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Startup failed:', error.message)
    process.exitCode = 1
  }
}

if (require.main === module) {
  startServer()
}

module.exports = { app, startServer }
