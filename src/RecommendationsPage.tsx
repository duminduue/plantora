
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import { API_URL } from './config'

type Plant = {
  _id: string
  name: string
  category: string
  price: number
  description: string
  imageUrl: string
  sunlight: string
}


function formatPrice(price: number) {
  return `LKR ${price.toLocaleString('en-LK')}`
}

export default function RecommendationsPage() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [category, setCategory] = useState('')
  const [sunlight, setSunlight] = useState('')
  const [maxBudget, setMaxBudget] = useState('3000')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlants() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(API_URL, {
          signal: controller.signal,
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load plants.')
        }

        setPlants(result.data as Plant[])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setError(
          err instanceof Error ? err.message : 'Something went wrong.'
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPlants()

    return () => controller.abort()
  }, [])

  const categories = useMemo(
    () => [...new Set(plants.map((plant) => plant.category))].sort(),
    [plants]
  )

  const sunlightOptions = useMemo(
    () => [...new Set(plants.map((plant) => plant.sunlight))].sort(),
    [plants]
  )

  const recommendations = useMemo(() => {
    return plants.filter((plant) => {
      const matchesCategory = !category || plant.category === category
      const matchesSunlight = !sunlight || plant.sunlight === sunlight
      const matchesBudget =
        maxBudget.trim() === '' ||
        (Number(maxBudget) >= 0 && plant.price <= Number(maxBudget))

      return matchesCategory && matchesSunlight && matchesBudget
    })
  }, [plants, category, sunlight, maxBudget])

  function resetPreferences() {
    setCategory('')
    setSunlight('')
    setMaxBudget('3000')
    setSubmitted(false)
  }

  return (
    <main className="site-shell recommendations-page">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Plantora home">
          plantora<span>.</span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/#plants">Plants</Link>
          <Link to="/recommendations" aria-current="page">
            Recommendations
          </Link>
        </nav>

        <Link className="header-button" to="/#plants">
          Explore plants <span>↗</span>
        </Link>
      </header>

      <section className="recommendation-hero">
        <p className="eyebrow">YOUR PERSONAL PLANT FINDER</p>
        <h1>
          Find plants that
          <br />
          <span>fit your lifestyle.</span>
        </h1>
        <p>
          Tell us about your space and budget. We’ll find matching plants
          from our current collection.
        </p>
      </section>

      <section className="recommendation-content">
        <div className="recommendation-form">
          <div className="recommendation-form-heading">
            <p className="eyebrow">YOUR PREFERENCES</p>
            <h2>Let’s find your plant.</h2>
            <p>Choose the options that work best for you.</p>
          </div>

          <div className="recommendation-field">
            <label htmlFor="recommend-category">Plant category</label>
            <select
              id="recommend-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setSubmitted(false)
              }}
            >
              <option value="">Any category</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="recommendation-field">
            <label htmlFor="recommend-sunlight">Sunlight available</label>
            <select
              id="recommend-sunlight"
              value={sunlight}
              onChange={(event) => {
                setSunlight(event.target.value)
                setSubmitted(false)
              }}
            >
              <option value="">Any sunlight condition</option>
              {sunlightOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="recommendation-field">
            <label htmlFor="recommend-budget">Maximum budget (LKR)</label>
            <input
              id="recommend-budget"
              type="number"
              min="0"
              step="100"
              placeholder="e.g. 3000"
              value={maxBudget}
              onChange={(event) => {
                setMaxBudget(event.target.value)
                setSubmitted(false)
              }}
            />
          </div>

          {maxBudget.trim() !== '' && Number(maxBudget) < 0 && (
            <p className="validation-message" role="alert">
              Budget cannot be negative.
            </p>
          )}

          <button
            className="primary-button recommendation-submit"
            type="button"
            disabled={maxBudget.trim() !== '' && Number(maxBudget) < 0}
            onClick={() => setSubmitted(true)}
          >
            Find my plants <span>↗</span>
          </button>

          <button
            className="reset-button recommendation-reset"
            type="button"
            onClick={resetPreferences}
          >
            Reset preferences
          </button>
        </div>

        <div className="recommendation-results">
          <div className="recommendation-results-heading">
            <div>
              <p className="eyebrow">MATCHED FOR YOU</p>
              <h2>Plant suggestions</h2>
            </div>
            {!loading && !error && (
              <span className="recommendation-count">
                {recommendations.length} found
              </span>
            )}
          </div>

          {loading ? (
            <div className="status-panel" role="status">
              <span className="loader" />
              <p>Finding your plants...</p>
            </div>
          ) : error ? (
            <div className="status-panel error-panel" role="alert">
              <h3>We couldn't load recommendations.</h3>
              <p>{error}</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="status-panel">
              <span className="empty-icon">🌱</span>
              <h3>No matching plants yet</h3>
              <p>
                Try increasing your budget or changing your preferences.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={resetPreferences}
              >
                Change preferences
              </button>
            </div>
          ) : (
            <>
              {submitted && (
                <p className="recommendation-feedback" role="status">
                  Here are the plants that match your selected preferences.
                </p>
              )}

              <div className="recommendation-grid">
                {recommendations.map((plant) => (
                  <article className="recommendation-card" key={plant._id}>
                    <Link
                      to={`/plants/${plant._id}`}
                      className="recommendation-card-link"
                    >
                      <div className="recommendation-image">
                        <img
                          src={plant.imageUrl}
                          alt={plant.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                            const fallback =
                              event.currentTarget.nextElementSibling
                            if (fallback instanceof HTMLElement) {
                              fallback.style.display = 'grid'
                            }
                          }}
                        />
                        <div
                          className="image-fallback"
                          aria-hidden="true"
                        >
                          <span>🌿</span>
                          <small>Plantora</small>
                        </div>
                        <span className="category-badge">
                          {plant.category}
                        </span>
                      </div>

                      <div className="recommendation-card-body">
                        <p className="plant-category">
                          {plant.category} plant
                        </p>
                        <h3>{plant.name}</h3>
                        <p className="plant-description">
                          {plant.description}
                        </p>

                        <div className="recommendation-care">
                          <span aria-hidden="true">☀</span>
                          <span>{plant.sunlight}</span>
                        </div>

                        <div className="recommendation-card-bottom">
                          <p className="plant-price">
                            {formatPrice(plant.price)}
                          </p>
                          <span className="plant-arrow" aria-hidden="true">
                            ↗
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="site-footer">
        <Link className="brand" to="/">
          plantora<span>.</span>
        </Link>
        <p>Make room for nature.</p>
        <span>Plant marketplace · V1</span>
      </footer>
    </main>
  )
}
