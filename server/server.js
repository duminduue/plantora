
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const plantRoutes = require('./routes/plantRoutes')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use('/api/plants', plantRoutes)

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Plantora API is running 🌿',
  })
})

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Plantora API',
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

    console.log('Plantora MongoDB connected successfully 🌿')

    app.listen(PORT, () => {
      console.log(`Plantora API running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
