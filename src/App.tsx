// src/App.tsx

import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'
import RecommendationsPage from './RecommendationsPage'
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

/* -------------------- Plant Image -------------------- */

function PlantImage({
  plant,
  className = '',
}: {
  plant: Plant
  className?: string
}) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className={`plant-image-wrap ${className}`}>
      {!imageFailed ? (
        <img
          className="plant-image"
          src={plant.imageUrl}
          alt={plant.name}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="image-fallback"
          aria-label={`${plant.name} image unavailable`}
        >
          <span>🌿</span>
          <small>Plantora</small>
        </div>
      )}

      <span className="category-badge">{plant.category}</span>
    </div>
  )
}

/* -------------------- Navigation -------------------- */

function SiteHeader() {
  const location = useLocation()
  const navigate = useNavigate()

  function navigateToSection(sectionId: string) {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } })
      return
    }

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null
    const sectionId = state?.scrollTo

    if (location.pathname === '/' && sectionId) {
      const timeout = window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })

        window.history.replaceState({}, document.title, '/')
      }, 100)

      return () => window.clearTimeout(timeout)
    }
  }, [location.pathname, location.state])

  return (
    <header className="site-header">
      <Link
        className="brand"
        to="/"
        aria-label="Plantora home"
      >
        plantora<span>.</span>
      </Link>

      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/">Home</Link>

        <a
          href="/#plants"
          onClick={(event) => {
            event.preventDefault()
            navigateToSection('plants')
          }}
        >
          Plants
        </a>

        <Link to="/recommendations">Recommendations</Link>

        <a
          href="/#about"
          onClick={(event) => {
            event.preventDefault()
            navigateToSection('about')
          }}
        >
          About
        </a>
      </nav>

      <a
        className="header-button"
        href="/#plants"
        onClick={(event) => {
          event.preventDefault()
          navigateToSection('plants')
        }}
      >
        Explore plants <span>↗</span>
      </a>
    </header>
  )
}

/* -------------------- Homepage -------------------- */

function HomePage() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlants() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (search.trim()) params.set('search', search.trim())
        if (category) params.set('category', category)
        if (minPrice !== '') params.set('minPrice', minPrice)
        if (maxPrice !== '') params.set('maxPrice', maxPrice)

        const query = params.toString()
        const response = await fetch(
          `${API_URL}${query ? `?${query}` : ''}`,
          { signal: controller.signal }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load plants.')
        }

        setPlants(result.data)

        const categoryResponse = await fetch(API_URL, {
          signal: controller.signal,
        })

        const categoryResult = await categoryResponse.json()

        if (!categoryResponse.ok || !categoryResult.success) {
          throw new Error('Could not load plant categories.')
        }

        const uniqueCategories = [
          ...new Set(
            categoryResult.data.map((plant: Plant) => plant.category)
          ),
        ].sort() as string[]

        setCategories(uniqueCategories)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setError(
          err instanceof Error ? err.message : 'Something went wrong.'
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    const timeout = window.setTimeout(loadPlants, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [search, category, minPrice, maxPrice, reload])

  function resetFilters() {
    setSearch('')
    setCategory('')
    setMinPrice('')
    setMaxPrice('')
  }

  const invalidPriceRange =
    minPrice !== '' &&
    maxPrice !== '' &&
    Number(minPrice) > Number(maxPrice)

  return (
    <main className="site-shell" id="home">
      <SiteHeader />

      {/* Hero */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A LITTLE MORE GREEN</p>

          <h1>
            Find your perfect
            <br />
            <span>green companion.</span>
          </h1>

          <p className="hero-description">
            Discover plants that bring your spaces to life.
            Explore our collection and find the right green
            companion for your home.
          </p>

          <a
            className="primary-button"
            href="#plants"
            onClick={(event) => {
              event.preventDefault()
              document.getElementById('plants')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }}
          >
            Discover plants <span>↗</span>
          </a>

          <p className="hero-note">Discover. Choose. Grow.</p>
        </div>

        <div className="hero-art">
          <img
            className="hero-plant-photo"
            src="/image/hero-plant.png"
            alt="Green indoor plant"
          />

          <p className="hero-tagline">
            Bring nature home<span>.</span>
          </p>
        </div>
      </section>

      {/* Plant Catalogue */}
      <section className="catalogue" id="plants">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE PLANT COLLECTION</p>
            <h2>Find your next favourite.</h2>
            <p className="section-description">
              Thoughtfully selected greens for your space.
            </p>
          </div>

          <span className="catalogue-label">PLANTORA COLLECTION</span>
        </div>

        <div className="filter-panel">
          <div className="search-field">
            <label htmlFor="plant-search">Search plants</label>

            <div className="search-input-wrap">
              <span aria-hidden="true">⌕</span>
              <input
                id="plant-search"
                type="search"
                placeholder="Try Monstera, Aloe..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="filter-field">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="min-price">Min. price (LKR)</label>
            <input
              id="min-price"
              type="number"
              min="0"
              placeholder="0"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="max-price">Max. price (LKR)</label>
            <input
              id="max-price"
              type="number"
              min="0"
              placeholder="Any"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
          </div>

          <button
            className="reset-button"
            type="button"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>

        {invalidPriceRange && (
          <p className="validation-message" role="alert">
            Minimum price must not exceed maximum price.
          </p>
        )}

        <div className="results-heading">
          <p>
            {loading
              ? 'Loading collection...'
              : `${plants.length} ${plants.length === 1 ? 'plant' : 'plants'} found`}
          </p>

          <span>Prices shown in Sri Lankan rupees</span>
        </div>

        {loading ? (
          <div className="status-panel" role="status">
            <span className="loader" />
            <p>Growing your collection...</p>
          </div>
        ) : error ? (
          <div className="status-panel error-panel" role="alert">
            <span className="status-icon">!</span>
            <h3>We couldn't load the plants.</h3>
            <p>{error}</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => setReload((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : invalidPriceRange ? (
          <div className="status-panel">
            <h3>Check your price range</h3>
            <p>
              Enter a maximum price greater than or equal to the minimum.
            </p>
          </div>
        ) : plants.length === 0 ? (
          <div className="status-panel">
            <span className="empty-icon">🌱</span>
            <h3>No plants found</h3>
            <p>Try another search or adjust your filters.</p>
            <button
              className="primary-button"
              type="button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="plant-grid">
            {plants.map((plant) => (
              <article className="plant-card" key={plant._id}>
                <Link
                  className="plant-card-link"
                  to={`/plants/${plant._id}`}
                  aria-label={`View details for ${plant.name}`}
                >
                  <PlantImage plant={plant} />

                  <div className="plant-card-content">
                    <p className="plant-category">
                      {plant.category} plant
                    </p>

                    <h3>{plant.name}</h3>

                    <p className="plant-description">
                      {plant.description}
                    </p>

                    <div className="plant-card-bottom">
                      <div>
                        <span className="price-label">PRICE</span>
                        <p className="plant-price">
                          {formatPrice(plant.price)}
                        </p>
                      </div>

                      <span className="plant-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* About Plantora */}
      <section className="about-section" id="about">
        <div className="about-inner">
          <div className="about-heading">
            <p className="eyebrow">ABOUT PLANTORA</p>

            <h2>
              A little more green,
              <br />
              <span>a little more life.</span>
            </h2>

            <p className="about-description">
              Plantora helps plant lovers discover indoor plants
              for their spaces. Explore our collection, compare
              prices, and find green companions that suit your
              preferences and home.
            </p>

            <a
              className="primary-button about-button"
              href="/#plants"
              onClick={(event) => {
                event.preventDefault()
                document.getElementById('plants')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }}
            >
              Explore our collection <span>↗</span>
            </a>
          </div>

          {/* Transparent plant image on the right */}
          <div className="about-visual" aria-hidden="true">
            <img
              src="/image/about-plant.png"
              alt=""
              className="about-plant-image"
              loading="lazy"
            />
          </div>

          {/* About features */}
          <div className="about-features">
            <article className="about-feature-card">
              <div className="about-feature-icon" aria-hidden="true">
                🌿
              </div>
              <p className="about-feature-number">01</p>
              <h3>Discover</h3>
              <p>
                Explore our plant collection and discover
                different varieties for your space.
              </p>
            </article>

            <article className="about-feature-card">
              <div className="about-feature-icon" aria-hidden="true">
                ☀️
              </div>
              <p className="about-feature-number">02</p>
              <h3>Choose</h3>
              <p>
                Find suitable options using category,
                price and sunlight information.
              </p>
            </article>

            <article className="about-feature-card">
              <div className="about-feature-icon" aria-hidden="true">
                🪴
              </div>
              <p className="about-feature-number">03</p>
              <h3>Grow</h3>
              <p>
                Find a green companion that inspires
                you to bring more nature into your home.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Footer */}
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

/* -------------------- Plant Details Page -------------------- */

function PlantDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [plant, setPlant] = useState<Plant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlant() {
      setLoading(true)
      setError('')
      setPlant(null)

      try {
        if (!id) {
          throw new Error('Plant ID is missing.')
        }

        const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load plant details.')
        }

        setPlant(result.data as Plant)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setError(
          err instanceof Error ? err.message : 'Something went wrong.'
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPlant()

    return () => controller.abort()
  }, [id])

  return (
    <main className="site-shell plant-details-page">
      <SiteHeader />

      <section className="plant-details">
        <button
          className="details-back-button"
          type="button"
          onClick={() => navigate('/', { state: { scrollTo: 'plants' } })}
        >
          ← Back to collection
        </button>

        {loading ? (
          <div className="status-panel" role="status">
            <span className="loader" />
            <p>Loading plant details...</p>
          </div>
        ) : error || !plant ? (
          <div className="status-panel error-panel" role="alert">
            <span className="status-icon">!</span>
            <h2>We couldn't find this plant.</h2>
            <p>{error || 'This plant is not available.'}</p>
            <Link
              className="primary-button"
              to="/"
              state={{ scrollTo: 'plants' }}
            >
              Explore collection
            </Link>
          </div>
        ) : (
          <div className="plant-details-layout">
            <div className="plant-details-image">
              {!plant.imageUrl ? (
                <div className="image-fallback">
                  <span>🌿</span>
                  <small>Plantora</small>
                </div>
              ) : (
                <img
                  src={plant.imageUrl}
                  alt={plant.name}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              )}
            </div>

            <div className="plant-details-content">
              <p className="eyebrow">MEET YOUR NEW GREEN COMPANION</p>

              <span className="details-category">
                {plant.category}
              </span>

              <h1>{plant.name}</h1>

              <p className="details-price">
                {formatPrice(plant.price)}
              </p>

              <p className="details-description">
                {plant.description}
              </p>

              <div className="plant-care-info">
                <span className="care-icon" aria-hidden="true">☀</span>
                <div>
                  <p className="care-label">SUNLIGHT REQUIREMENT</p>
                  <p className="care-value">{plant.sunlight}</p>
                </div>
              </div>

              <button
                className="primary-button details-collection-button"
                type="button"
                onClick={() =>
                  navigate('/', { state: { scrollTo: 'plants' } })
                }
              >
                Back to collection
              </button>

              <p className="details-note">
                Find the right plant and make room for nature.
              </p>
            </div>
          </div>
        )}
      </section>

      <footer className="site-footer" id="about">
        <Link className="brand" to="/">
          plantora<span>.</span>
        </Link>

        <p>Make room for nature.</p>
        <span>Plant marketplace · V1</span>
      </footer>
    </main>
  )
}

/* -------------------- Not Found Page -------------------- */

function NotFoundPage() {
  return (
    <main className="site-shell">
      <SiteHeader />

      <div className="status-panel">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>

        <Link className="primary-button" to="/">
          Return home
        </Link>
      </div>
    </main>
  )
}

/* -------------------- App Routes -------------------- */

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/plants/:id" element={<PlantDetailsPage />} />
        <Route
          path="/recommendations"
          element={<RecommendationsPage />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App