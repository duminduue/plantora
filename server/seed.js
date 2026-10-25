
require('dotenv').config({ path: './server/.env' })

const mongoose = require('mongoose')
const Plant = require('./models/Plant')

const plants = [
  {
    name: 'Monstera Deliciosa',
    category: 'Indoor',
    price: 4500,
    description:
      'A popular tropical houseplant with distinctive split leaves.',
    imageUrl:
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1200&q=80',
    sunlight: 'Indirect sunlight',
  },
  {
    name: 'Snake Plant',
    category: 'Indoor',
    price: 2500,
    description:
      'A hardy, low-maintenance plant with upright leaves.',
    imageUrl:
      'https://images.unsplash.com/photo-1593482892290-f54927ae2c9b?auto=format&fit=crop&w=1200&q=80',
    sunlight: 'Low to bright indirect light',
  },
  {
    name: 'Aloe Vera',
    category: 'Succulent',
    price: 1800,
    description:
      'A succulent plant with thick, fleshy green leaves.',
    imageUrl:
      'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=1200&q=80',
    sunlight: 'Bright indirect sunlight',
  },
  {
    name: 'Peace Lily',
    category: 'Indoor',
    price: 3200,
    description:
      'An elegant houseplant with dark green leaves.',
    imageUrl:
      'https://images.unsplash.com/photo-CD4NPRRalgA?auto=format&fit=crop&w=1200&q=80',
    sunlight: 'Medium indirect sunlight',
  },
  {
    name: 'Jade Plant',
    category: 'Succulent',
    price: 1500,
    description:
      'A compact succulent with thick, rounded green leaves.',
    imageUrl:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
    sunlight: 'Bright indirect sunlight',
  },
]

async function seedPlants() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is missing from server/.env'
      )
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB.')

    for (const plant of plants) {
      const { imageUrl, ...plantDetails } = plant

      await Plant.updateOne(
        { name: plant.name },
        {
          $set: { imageUrl },
          $setOnInsert: plantDetails,
        },
        { upsert: true }
      )

      console.log(`Updated image: ${plant.name}`)
    }

    console.log('Plant image update completed.')
  } catch (error) {
    console.error('Plant update failed:', error.message)
    process.exitCode = 1
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  }
}

seedPlants()
