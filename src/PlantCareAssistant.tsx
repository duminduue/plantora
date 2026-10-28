
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from './config'
import './PlantCareAssistant.css'

type Message = {
  role: 'user' | 'assistant'
  text: string
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function formatAnswer(text: string) {
  return text.split('\n').map((rawLine, index) => {
    const line = rawLine.trim()

    if (!line) return <div className="answer-spacer" key={index} />

    if (/^#{1,3}\s/.test(line)) {
      return (
        <h3 key={index}>
          {renderInline(line.replace(/^#{1,3}\s+/, ''))}
        </h3>
      )
    }

    if (/^[-*]\s/.test(line)) {
      return (
        <div className="answer-list-item" key={index}>
          <span aria-hidden="true">•</span>
          <span>{renderInline(line.replace(/^[-*]\s+/, ''))}</span>
        </div>
      )
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/)

    if (numbered) {
      return (
        <div className="answer-list-item" key={index}>
          <span className="answer-list-number">{numbered[1]}.</span>
          <span>{renderInline(numbered[2])}</span>
        </div>
      )
    }

    return <p key={index}>{renderInline(line)}</p>
  })
}

export default function PlantCareAssistant() {
  const [question, setQuestion] = useState('')
  const [plantName, setPlantName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = question.trim()
    if (!trimmed || loading) return

    setError('')
    setMessages(current => [
      ...current,
      { role: 'user', text: trimmed },
    ])
    setQuestion('')
    setLoading(true)

    try {
      const endpoint = API_URL.replace(
        /\/api\/plants\/?$/,
        '/api/plant-care/chat'
      )

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          plantName: plantName.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to get plant-care advice.'
        )
      }

      if (
        typeof result.data?.answer !== 'string' ||
        !result.data.answer.trim()
      ) {
        throw new Error('The AI returned an empty answer. Please try again.')
      }

      setMessages(current => [
        ...current,
        { role: 'assistant', text: result.data.answer },
      ])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the plant-care assistant.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          plantorai<span>.</span>
        </Link>
        <nav className="plant-care-nav">
          <Link to="/">Marketplace</Link>
          <Link to="/recommendations">Recommendations</Link>
        </nav>
      </header>

      <section className="plant-care-page">
        <p className="eyebrow">PLANTORAI AI</p>
        <h1>Plant-care assistant</h1>
        <p className="plant-care-intro">
          Ask about watering, sunlight, soil, humidity, or common plant problems.
        </p>

        <label className="auth-field plant-care-plant">
          Plant name (optional)
          <input
            value={plantName}
            onChange={event => setPlantName(event.target.value)}
            maxLength={100}
            placeholder="e.g. Monstera deliciosa"
          />
        </label>

        <section
          className="plant-care-chat"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.length === 0 && (
            <div className="plant-care-empty">
              <span aria-hidden="true">🌱</span>
              <h2>What would you like to know?</h2>
              <p>Try: “Why are my plant's leaves turning yellow?”</p>
            </div>
          )}

          {messages.map((message, index) => (
            <article
              className={`plant-care-message ${message.role}`}
              key={index}
            >
              <strong>
                {message.role === 'user' ? 'You' : 'PlantorAI assistant'}
              </strong>

              <div className="plant-care-answer">
                {message.role === 'assistant'
                  ? formatAnswer(message.text)
                  : <p>{message.text}</p>}
              </div>
            </article>
          ))}

          {loading && (
            <p className="plant-care-loading" role="status">
              Thinking about your plant…
            </p>
          )}

          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}
        </section>

        <form className="plant-care-form" onSubmit={sendQuestion}>
          <label className="auth-field" htmlFor="plant-care-question">
            Your question
          </label>

          <textarea
            id="plant-care-question"
            value={question}
            onChange={event => setQuestion(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Ask a plant-care question…"
            required
          />

          <div className="plant-care-form-footer">
            <small>{question.length}/1000 characters</small>
            <button
              className="primary-button"
              type="submit"
              disabled={loading || question.trim().length === 0}
            >
              {loading ? 'Sending…' : 'Ask assistant'}
            </button>
          </div>
        </form>

        <p className="plant-care-disclaimer">
          Limitations: AI guidance may be incomplete or incorrect and is not a
          guarantee. Verify important toxicity, disease, or treatment decisions
          with a reliable horticultural source.
        </p>
      </section>
    </main>
  )
}
