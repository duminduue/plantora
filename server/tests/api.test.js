
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import express from 'express'
import jwt from 'jsonwebtoken'
import { authorize } from '../middleware/auth.js'
import User from '../models/User.js'
import Order from '../models/Order.js'
import Plant from '../models/Plant.js'
import StockMovement from '../models/StockMovement.js'
import serverModule from '../server.js'

const { app } = serverModule
const testEmails = []
const testPlantIds = []

describe('PlantorAI API', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-only-secret-at-least-32-characters-long'
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
    if (mongoose.connection.readyState === 1 && testEmails.length) {
      await User.deleteMany({ email: { $in: testEmails } })
      await Order.deleteMany({ email: { $in: testEmails } })
    }
    if (mongoose.connection.readyState === 1 && testPlantIds.length) {
      await StockMovement.deleteMany({ plant: { $in: testPlantIds } })
      await Plant.deleteMany({ _id: { $in: testPlantIds } })
    }
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

  
  it('GET /api/plants should filter by minimum price', async () => {
    const response = await request(app).get('/api/plants?minPrice=3000')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(
      response.body.data.every((plant) => plant.price >= 3000)
    ).toBe(true)
  })

  it('GET /api/plants should filter by maximum price', async () => {
    const response = await request(app).get('/api/plants?maxPrice=3000')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(
      response.body.data.every((plant) => plant.price <= 3000)
    ).toBe(true)
  })

  it('GET /api/plants should filter by category', async () => {
    const response = await request(app).get('/api/plants?category=Indoor')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(
      response.body.data.every(
        (plant) => plant.category.toLowerCase() === 'indoor'
      )
    ).toBe(true)
  })

  it('GET /api/plants should filter by search term', async () => {
    const response = await request(app).get('/api/plants?search=Monstera')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(
      response.body.data.every((plant) =>
        plant.name.toLowerCase().includes('monstera')
      )
    ).toBe(true)
  })

  
  it('GET /api/plants/:id should return a plant for a valid existing ID', async () => {
    const listResponse = await request(app).get('/api/plants')

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data.length).toBeGreaterThan(0)

    const plantId = listResponse.body.data[0]._id
    const response = await request(app).get(`/api/plants/${plantId}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data._id).toBe(plantId)
  })

  it('GET /api/plants/:id should return 404 for a valid but nonexistent ID', async () => {
    const nonexistentId = '000000000000000000000000'
    const response = await request(app).get(`/api/plants/${nonexistentId}`)

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('Plant not found')
  })

  
  it('GET /api/plants should reject an invalid maximum price', async () => {
    const response = await request(app).get('/api/plants?maxPrice=abc')

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('maxPrice must be a valid number')
  })

  it('GET /api/plants should reject a negative price', async () => {
    const response = await request(app).get('/api/plants?minPrice=-100')

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('Price range is invalid')
  })

  it('GET /api/plants should reject a reversed price range', async () => {
    const response = await request(app).get(
      '/api/plants?minPrice=5000&maxPrice=1000'
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('Price range is invalid')
  })

  it('GET /api/plants should return no results for an unmatched search', async () => {
    const response = await request(app).get(
      '/api/plants?search=NoSuchPlantName123'
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.count).toBe(0)
    expect(response.body.data).toEqual([])
  })


  it('POST /api/orders should validate prices and persist an order as Pending', async () => {
    const plant = await Plant.create({
      name: 'Checkout Test Plant',
      category: 'Test',
      price: 1250,
      description: 'Temporary plant used by an API test',
      stock: 10,
    })
    testPlantIds.push(plant._id)
    const email = `order-test-${Date.now()}@example.com`
    testEmails.push(email)
    const response = await request(app).post('/api/orders').send({
      customerName: 'Order Test Customer',
      email,
      phone: '0771234567',
      address: '123 Green Street, Colombo',
      items: [{ plantId: plant._id.toString(), quantity: 2 }],
    })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.orderNumber).toMatch(/^PA-/)
    expect(response.body.data.status).toBe('Pending')
    expect(response.body.data.subtotal).toBe(plant.price * 2)
    const updatedPlant = await Plant.findById(plant._id)
    expect(updatedPlant.stock).toBe(8)
    const savedOrder = await Order.findOne({ orderNumber: response.body.data.orderNumber })
    expect(savedOrder).toBeTruthy()
    expect(savedOrder.email).toBe(email)
    expect(savedOrder.phone).toBe('0771234567')
    const saleMovement = await StockMovement.findOne({ orderNumber: response.body.data.orderNumber, plant: plant._id })
    expect(saleMovement).toBeTruthy()
    expect(saleMovement.type).toBe('Sale')
    expect(saleMovement.quantityChange).toBe(-2)
    expect(saleMovement.stockBefore).toBe(10)
    expect(saleMovement.stockAfter).toBe(8)
  })

  it('POST /api/orders should reject invalid checkout details', async () => {
    const response = await request(app).post('/api/orders').send({
      customerName: 'A',
      email: 'invalid-email',
      phone: '123',
      address: 'short',
      items: [],
    })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('POST /api/orders should reject an empty cart', async () => {
    const response = await request(app).post('/api/orders').send({
      customerName: 'Empty Cart Customer',
      email: 'empty-cart@example.com',
      phone: '0771234567',
      address: '123 Green Street, Colombo',
      items: [],
    })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('Order must contain between 1 and 50 items')
  })

  it('POST /api/orders should reject checkout when stock is unavailable', async () => {
    const plant = await Plant.create({
      name: 'Out of Stock Test Plant',
      category: 'Test',
      price: 1000,
      description: 'Temporary plant used by an API test',
      stock: 0,
    })
    const email = `out-of-stock-${Date.now()}@example.com`
    testEmails.push(email)

    const response = await request(app).post('/api/orders').send({
      customerName: 'Stock Test Customer',
      email,
      phone: '0771234567',
      address: '123 Green Street, Colombo',
      items: [{ plantId: plant._id.toString(), quantity: 1 }],
    })

    expect(response.status).toBe(409)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toContain('Not enough stock')
    const unchangedPlant = await Plant.findById(plant._id)
    expect(unchangedPlant.stock).toBe(0)
    await Plant.deleteOne({ _id: plant._id })
  })

  it('POST /api/orders should reject invalid item IDs and quantities', async () => {
    const base = {
      customerName: 'Order Test Customer',
      email: 'order-validation@example.com',
      phone: '0771234567',
      address: '123 Green Street, Colombo',
    }
    const badId = await request(app).post('/api/orders').send({
      ...base,
      items: [{ plantId: 'not-an-id', quantity: 1 }],
    })
    const badQuantity = await request(app).post('/api/orders').send({
      ...base,
      items: [{ plantId: new mongoose.Types.ObjectId().toString(), quantity: 0 }],
    })

    expect(badId.status).toBe(400)
    expect(badQuantity.status).toBe(400)
  })

  it('admin API should reject customers and allow an admin dashboard request', async () => {
    const customerEmail = `admin-denied-${Date.now()}@example.com`
    const adminEmail = `admin-allowed-${Date.now()}@example.com`
    testEmails.push(customerEmail, adminEmail)

    const customerRegistration = await request(app).post('/api/auth/register').send({
      name: 'Dashboard Customer',
      email: customerEmail,
      password: 'StrongPassword123',
    })
    expect(customerRegistration.status).toBe(201)

    const denied = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerRegistration.body.token}`)
    expect(denied.status).toBe(403)

    const admin = await User.create({
      name: 'Dashboard Admin',
      email: adminEmail,
      passwordHash: 'test-only-hash-not-used-for-this-request',
      role: 'admin',
    })
    const adminToken = jwt.sign(
      { sub: admin._id.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h', issuer: 'plantorai-api', audience: 'plantorai-client' }
    )
    const allowed = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(allowed.status).toBe(200)
    expect(allowed.body.success).toBe(true)
    expect(typeof allowed.body.data.plantCount).toBe('number')
    expect(typeof allowed.body.data.orderCount).toBe('number')
    expect(typeof allowed.body.data.customerCount).toBe('number')
  })

  it('admin restock should update inventory and create a stock history record', async () => {
    const adminEmail = `admin-restock-${Date.now()}@example.com`
    testEmails.push(adminEmail)
    const admin = await User.create({
      name: 'Restock Test Admin',
      email: adminEmail,
      passwordHash: 'test-only-hash-not-used-for-this-request',
      role: 'admin',
    })
    const token = jwt.sign(
      { sub: admin._id.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h', issuer: 'plantorai-api', audience: 'plantorai-client' }
    )
    const plant = await Plant.create({
      name: 'Restock History Test Plant',
      category: 'Test',
      price: 1000,
      description: 'Temporary plant for stock history test',
      stock: 11,
    })
    testPlantIds.push(plant._id)

    const response = await request(app)
      .post(`/api/admin/plants/${plant._id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 20 })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.plant.stock).toBe(31)
    expect(response.body.data.movement.stockBefore).toBe(11)
    expect(response.body.data.movement.stockAfter).toBe(31)

    const savedMovement = await StockMovement.findOne({ plant: plant._id, type: 'Restock' })
    expect(savedMovement).toBeTruthy()
    expect(savedMovement.quantityChange).toBe(20)

    const history = await request(app)
      .get('/api/admin/stock-history')
      .set('Authorization', `Bearer ${token}`)
    expect(history.status).toBe(200)
    expect(history.body.data.some((entry) => entry._id === savedMovement._id.toString())).toBe(true)
  })

  it('admin API should validate plant creation data', async () => {
    const adminEmail = `admin-validation-${Date.now()}@example.com`
    testEmails.push(adminEmail)
    const admin = await User.create({
      name: 'Plant Admin',
      email: adminEmail,
      passwordHash: 'test-only-hash-not-used-for-this-request',
      role: 'admin',
    })
    const token = jwt.sign(
      { sub: admin._id.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h', issuer: 'plantorai-api', audience: 'plantorai-client' }
    )

    const response = await request(app)
      .post('/api/admin/plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', category: 'Test', price: -1, stock: -2, description: 'short' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('POST /api/auth/register should create a customer with a hashed password', async () => {
    const email = `auth-test-${Date.now()}@example.com`
    testEmails.push(email)
    const response = await request(app).post('/api/auth/register').send({
      name: 'Auth Test User',
      email,
      password: 'StrongPassword123',
      role: 'admin',
    })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.user.email).toBe(email)
    expect(response.body.user.role).toBe('customer')
    expect(response.body.user.passwordHash).toBeUndefined()
    expect(typeof response.body.token).toBe('string')

    const savedUser = await User.findOne({ email }).select('+passwordHash')
    expect(savedUser.passwordHash).not.toBe('StrongPassword123')
    expect(savedUser.role).toBe('customer')
  })

  it('POST /api/auth/register should reject invalid inputs', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('POST /api/auth/register should reject a duplicate email', async () => {
    const email = `auth-duplicate-${Date.now()}@example.com`
    testEmails.push(email)
    const payload = { name: 'Duplicate Test', email, password: 'StrongPassword123' }
    const first = await request(app).post('/api/auth/register').send(payload)
    const second = await request(app).post('/api/auth/register').send(payload)

    expect(first.status).toBe(201)
    expect(second.status).toBe(409)
  })

  it('POST /api/auth/login should return a token for valid credentials', async () => {
    const email = `auth-login-${Date.now()}@example.com`
    testEmails.push(email)
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email,
      password: 'StrongPassword123',
    })

    const response = await request(app).post('/api/auth/login').send({
      email: email.toUpperCase(),
      password: 'StrongPassword123',
    })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(typeof response.body.token).toBe('string')
    expect(response.body.user.role).toBe('customer')
  })

  it('POST /api/auth/login should reject incorrect credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'WrongPassword123',
    })

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Invalid email or password')
  })

  it('GET /api/auth/me should require a valid token', async () => {
    const response = await request(app).get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
  })

  it('GET /api/auth/me should return the current user with a valid token', async () => {
    const email = `auth-me-${Date.now()}@example.com`
    testEmails.push(email)
    const registration = await request(app).post('/api/auth/register').send({
      name: 'Me Test',
      email,
      password: 'StrongPassword123',
    })

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registration.body.token}`)

    expect(response.status).toBe(200)
    expect(response.body.user.email).toBe(email)
    expect(response.body.user.role).toBe('customer')
  })


  it('GET /api/auth/me should reject an expired JWT', async () => {
    const expiredToken = jwt.sign(
      { sub: new mongoose.Types.ObjectId().toString(), role: 'customer' },
      process.env.JWT_SECRET,
      {
        expiresIn: -1,
        issuer: 'plantorai-api',
        audience: 'plantorai-client',
      }
    )

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Invalid or expired token')
  })

  it('GET /api/auth/me should reject an invalid JWT', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer definitely-not-a-valid-jwt')

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('Invalid or expired token')
  })

  it('role authorization should deny customers access to admin-only routes', async () => {
    const roleApp = express()
    roleApp.get(
      '/admin-only',
      (req, res, next) => {
        req.user = { id: 'test-user', role: req.header('x-test-role') }
        next()
      },
      authorize('admin'),
      (req, res) => res.status(200).json({ success: true })
    )

    const response = await request(roleApp)
      .get('/admin-only')
      .set('x-test-role', 'customer')

    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
  })

  it('role authorization should allow admins to access admin-only routes', async () => {
    const roleApp = express()
    roleApp.get(
      '/admin-only',
      (req, res, next) => {
        req.user = { id: 'test-admin', role: req.header('x-test-role') }
        next()
      },
      authorize('admin'),
      (req, res) => res.status(200).json({ success: true })
    )

    const response = await request(roleApp)
      .get('/admin-only')
      .set('x-test-role', 'admin')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('role authorization should reject requests without an authenticated user', async () => {
    const roleApp = express()
    roleApp.get('/admin-only', authorize('admin'), (req, res) => {
      res.status(200).json({ success: true })
    })

    const response = await request(roleApp).get('/admin-only')

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
  })

})
