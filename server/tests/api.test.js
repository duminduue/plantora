
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import serverModule from '../server.js'

const { app } = serverModule

describe('PlantorAI API', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing from server/.env')
      }

      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      })
    }
  }, 15000)

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  }, 15000)

  it('GET / should return the API welcome message', async () => {
    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.message).toContain('PlantorAI API is running')
  })

  it('GET /api/health should return health status', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.service).toBe('PlantorAI API')
    expect(response.body.status).toBe('healthy')
    expect(response.body.database).toMatch(/connected|disconnected/)
  })

  it('GET /api/plants should return a successful response', async () => {
    const response = await request(app)
      .get('/api/plants')
      .timeout({ response: 15000, deadline: 20000 })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.count).toBe(response.body.data.length)
  }, 25000)

  it('GET /api/plants should reject invalid minimum price', async () => {
    const response = await request(app).get('/api/plants?minPrice=abc')

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('minPrice must be a valid number')
  })

  it('GET /api/plants should reject repeated search parameters', async () => {
    const response = await request(app).get(
      '/api/plants?search=Monstera&search=Snake'
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe(
      'search must be a single string value'
    )
  })

  it('GET /api/plants/:id should reject an invalid plant ID', async () => {
    const response = await request(app).get('/api/plants/not-a-valid-id')

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('Invalid plant ID')
  })
})
