import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import plantCareModule from '../routes/plantCareRoutes.js'

const { router, resetRateLimitsForTests } = plantCareModule
const app = express()
app.use(express.json({ limit: '10kb' }))
app.use('/api/plant-care', router)

const originalApiKey = process.env.GEMINI_API_KEY
const originalFetch = global.fetch

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY
  else process.env.GEMINI_API_KEY = originalApiKey
  global.fetch = originalFetch
  resetRateLimitsForTests()
  vi.restoreAllMocks()
})

describe('Plant-care AI endpoint', () => {
  it('rejects an empty question', async () => {
    const response = await request(app).post('/api/plant-care/chat').send({ question: '   ' })
    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('rejects questions that exceed the length limit', async () => {
    const response = await request(app).post('/api/plant-care/chat').send({ question: 'x'.repeat(1001) })
    expect(response.status).toBe(400)
  })

  it('reports missing server API configuration without calling the provider', async () => {
    delete process.env.GEMINI_API_KEY
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy
    const response = await request(app).post('/api/plant-care/chat').send({ question: 'How often should I water a fern?' })
    expect(response.status).toBe(503)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns the generated plant-care answer from a successful provider response', async () => {
    process.env.GEMINI_API_KEY = 'test-key-not-real'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Water when the top layer of soil feels dry.' }] } }] }),
    })
    const response = await request(app).post('/api/plant-care/chat').send({ question: 'How often should I water a fern?', plantName: 'Fern' })
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.answer).toContain('top layer')
    expect(response.body.data.disclaimer).toBeTruthy()
  })

  it('converts provider quota failures into a safe service error', async () => {
    process.env.GEMINI_API_KEY = 'test-key-not-real'
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    const response = await request(app).post('/api/plant-care/chat').send({ question: 'Why are leaves yellow?' })
    expect(response.status).toBe(503)
    expect(response.body.message).toContain('quota')
  })

  it('limits repeated requests from the same client', async () => {
    delete process.env.GEMINI_API_KEY
    let response
    for (let i = 0; i < 11; i += 1) {
      response = await request(app).post('/api/plant-care/chat').set('X-Forwarded-For', '203.0.113.10').send({ question: 'Watering advice?' })
    }
    expect(response.status).toBe(429)
  })
})
