// src/App.tsx

import { Fragment, useEffect, useState } from 'react'
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
  stock?: number
}


type CartItem = {
  plant: Plant
  quantity: number
}

const CART_KEY = 'plantorai_cart'

function readCart(): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new Event('plantorai-cart-updated'))
}

function addToCart(plant: Plant) {
  const cart = readCart()
  const existing = cart.find((item) => item.plant._id === plant._id)
  if (existing) existing.quantity += 1
  else cart.push({ plant, quantity: 1 })
  saveCart(cart)
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
          <small>PlantorAI</small>
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
  const [signedIn, setSignedIn] = useState(() => Boolean(localStorage.getItem('plantorai_token')))
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('plantorai_user') || 'null')?.role === 'admin'
    } catch {
      return false
    }
  })
  const [cartCount, setCartCount] = useState(() => readCart().reduce((sum, item) => sum + item.quantity, 0))

  useEffect(() => {
    setSignedIn(Boolean(localStorage.getItem('plantorai_token')))
    try {
      setIsAdmin(JSON.parse(localStorage.getItem('plantorai_user') || 'null')?.role === 'admin')
    } catch {
      setIsAdmin(false)
    }
  }, [location.pathname])

  useEffect(() => {
    const updateCartCount = () => setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0))
    window.addEventListener('plantorai-cart-updated', updateCartCount)
    window.addEventListener('storage', updateCartCount)
    return () => {
      window.removeEventListener('plantorai-cart-updated', updateCartCount)
      window.removeEventListener('storage', updateCartCount)
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('plantorai_token')
    localStorage.removeItem('plantorai_user')
    setSignedIn(false)
    setIsAdmin(false)
    navigate('/')
  }

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
        aria-label="PlantorAI home"
      >
        plantorai<span>.</span>
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

      <div className="header-actions">
        <Link className="auth-nav-link" to="/cart">Cart ({cartCount})</Link>
        {signedIn ? (
          <>
            {isAdmin && <Link className="auth-nav-link" to="/admin">Admin</Link>}
            <Link className="auth-nav-link" to="/account">My account</Link>
            <button className="auth-nav-button" type="button" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="auth-nav-link" to="/login">Log in</Link>
            <Link className="header-button" to="/register">Sign up</Link>
          </>
        )}
      </div>
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

          <span className="catalogue-label">PLANTORAI COLLECTION</span>
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
                  </div>
                </Link>

                <div className="plant-card-footer">
                  <div className="plant-card-price">
                    <span className="price-label">PRICE</span>
                    <p className="plant-price">{formatPrice(plant.price)}</p>
                  </div>
                  <div className="plant-card-actions">
                    <Link
                      className="plant-view-button"
                      to={`/plants/${plant._id}`}
                      aria-label={`View ${plant.name} details`}
                    >
                      View details <span aria-hidden="true">↗</span>
                    </Link>
                    <button
                      className="cart-add-button"
                      type="button"
                      onClick={() => addToCart(plant)}
                      aria-label={`Add ${plant.name} to cart`}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* About PlantorAI */}
      <section className="about-section" id="about">
        <div className="about-inner">
          <div className="about-heading">
            <p className="eyebrow">ABOUT PLANTORAI</p>

            <h2>
              A little more green,
              <br />
              <span>a little more life.</span>
            </h2>

            <p className="about-description">
              PlantorAI helps plant lovers discover indoor plants
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
          plantorai<span>.</span>
        </Link>

        <p>Make room for nature.</p>
        <span>Plant marketplace</span>
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
                  <small>PlantorAI</small>
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

              <button
                className="primary-button cart-add-button details-add-button"
                type="button"
                onClick={() => addToCart(plant)}
              >
                Add to cart
              </button>

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
          plantorai<span>.</span>
        </Link>

        <p>Make room for nature.</p>
        <span>Plant marketplace · V1</span>
      </footer>
    </main>
  )
}


/* -------------------- Authentication Pages -------------------- */

type AuthPageProps = {
  mode: 'login' | 'register'
}

function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const isRegister = mode === 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const authApiUrl = API_URL.replace(/\/api\/plants\/?$/, '/api/auth')
      const response = await fetch(`${authApiUrl}/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || (isRegister ? 'Could not create your account.' : 'Could not log in.'))
      }

      localStorage.setItem('plantorai_token', result.token)
      localStorage.setItem('plantorai_user', JSON.stringify(result.user))
      setSuccess(isRegister ? 'Account created successfully. Redirecting…' : 'Login successful. Redirecting…')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="site-shell auth-page">
      <SiteHeader />
      <section className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">WELCOME TO PLANTORAI</p>
          <h1>{isRegister ? 'Make room for nature.' : 'Welcome back.'}</h1>
          <p>
            {isRegister
              ? 'Create an account to begin your PlantorAI journey.'
              : 'Log in to continue your plant discovery journey.'}
          </p>
          <div className="auth-leaf" aria-hidden="true">🌿</div>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <p className="eyebrow">{isRegister ? 'CREATE YOUR ACCOUNT' : 'YOUR ACCOUNT'}</p>
          <h2>{isRegister ? 'Sign up' : 'Log in'}</h2>
          <p className="auth-card-description">
            {isRegister ? 'It only takes a moment to get started.' : 'Enter your details to access your account.'}
          </p>

          {isRegister && (
            <label className="auth-field">
              Full name
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}

          <label className="auth-field">
            Email address
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </label>

          <label className="auth-field">
            Password
            <input
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isRegister ? 8 : undefined}
              maxLength={72}
              required
            />
            {isRegister && <span className="auth-hint">Use at least 8 characters.</span>}
          </label>

          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          {success && <p className="auth-message auth-success" role="status">{success}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Log in' : 'Sign up'}
            </Link>
          </p>
          <p className="auth-security-note">
            New public accounts are created with the customer role.
          </p>
        </form>
      </section>
      <footer className="site-footer">
        <Link className="brand" to="/">plantorai<span>.</span></Link>
        <p>Make room for nature.</p>
        <span>Plant marketplace</span>
      </footer>
    </main>
  )
}


/* -------------------- Protected Account Page -------------------- */

type AuthUser = {
  id: string
  name: string
  email: string
  role: 'customer' | 'seller' | 'admin'
}

function ProtectedAccountPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadCurrentUser() {
      const token = localStorage.getItem('plantorai_token')
      if (!token) {
        navigate('/login', { replace: true, state: { from: '/account' } })
        return
      }

      try {
        const authApiUrl = API_URL.replace(/\/api\/plants\/?$/, '/api/auth')
        const response = await fetch(`${authApiUrl}/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const result = await response.json()

        if (response.status === 401) {
          localStorage.removeItem('plantorai_token')
          localStorage.removeItem('plantorai_user')
          navigate('/login', { replace: true, state: { from: '/account' } })
          return
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load your account.')
        }

        setUser(result.user as AuthUser)
        localStorage.setItem('plantorai_user', JSON.stringify(result.user))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unable to load your account.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadCurrentUser()
    return () => controller.abort()
  }, [navigate])

  function logout() {
    localStorage.removeItem('plantorai_token')
    localStorage.removeItem('plantorai_user')
    navigate('/', { replace: true })
  }

  return (
    <main className="site-shell auth-page">
      <SiteHeader />
      <section className="account-panel">
        <p className="eyebrow">YOUR PLANTORAI ACCOUNT</p>
        <h1>My account</h1>

        {loading ? (
          <div className="status-panel" role="status">
            <span className="loader" />
            <p>Verifying your session…</p>
          </div>
        ) : error ? (
          <div className="status-panel error-panel" role="alert">
            <h2>We couldn't load your account.</h2>
            <p>{error}</p>
            <button className="primary-button" type="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : user ? (
          <div className="account-card">
            <div className="account-avatar" aria-hidden="true">🌿</div>
            <h2>{user.name}</h2>
            <p className="account-email">{user.email}</p>
            <div className="account-detail">
              <span>Account role</span>
              <strong>{user.role}</strong>
            </div>
            <p className="auth-security-note">
              Your account details are loaded from the authenticated backend session.
            </p>
            <button className="primary-button auth-submit" type="button" onClick={logout}>
              Log out
            </button>
          </div>
        ) : null}
      </section>
      <footer className="site-footer">
        <Link className="brand" to="/">plantorai<span>.</span></Link>
        <p>Make room for nature.</p>
        <span>Plant marketplace</span>
      </footer>
    </main>
  )
}

/* -------------------- Shopping Cart and Checkout -------------------- */

function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>(readCart)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [error, setError] = useState('')
  const [stockById, setStockById] = useState<Record<string, number>>({})
  const [stockLoading, setStockLoading] = useState(false)
  const [stockCheckError, setStockCheckError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkCartStock() {
      if (cart.length === 0) {
        setStockById({})
        setStockCheckError('')
        setStockLoading(false)
        return
      }

      setStockLoading(true)
      setStockCheckError('')
      try {
        const results = await Promise.all(
          cart.map(async (item) => {
            const response = await fetch(
              `${API_URL}/${encodeURIComponent(item.plant._id)}`
            )
            const result = await response.json()
            if (!response.ok || !result.success || !result.data) {
              throw new Error(result.message || `Could not check stock for ${item.plant.name}.`)
            }
            // Existing legacy documents without a stock field use the same
            // default as checkout, which initializes their stock to 100.
            return [item.plant._id, Number.isInteger(result.data.stock) ? result.data.stock : 100] as const
          })
        )

        if (!cancelled) {
          setStockById(Object.fromEntries(results))
        }
      } catch (err) {
        if (!cancelled) {
          setStockCheckError(
            err instanceof Error
              ? err.message
              : 'Unable to check stock right now. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setStockLoading(false)
      }
    }

    checkCartStock()
    return () => {
      cancelled = true
    }
  }, [cart.map((item) => item.plant._id).join('|')])

  const unavailableItems = cart.filter((item) => {
    const stock = stockById[item.plant._id]
    return stock !== undefined && (stock <= 0 || item.quantity > stock)
  })

  function updateCart(nextCart: CartItem[]) {
    setCart(nextCart)
    saveCart(nextCart)
  }

  function changeQuantity(plantId: string, quantity: number) {
    if (quantity < 1) {
      updateCart(cart.filter((item) => item.plant._id !== plantId))
      return
    }
    updateCart(cart.map((item) => item.plant._id === plantId ? { ...item, quantity: Math.min(quantity, 99) } : item))
  }

  const total = cart.reduce((sum, item) => sum + item.plant.price * item.quantity, 0)

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!cart.length) {
      setError('Your cart is empty.')
      return
    }

    try {
      const ordersApiUrl = API_URL.replace(/\/api\/plants\/?$/, '/api/orders')
      const response = await fetch(ordersApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          email,
          phone,
          address,
          items: cart.map((item) => ({
            plantId: item.plant._id,
            quantity: item.quantity,
          })),
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to place your order.')
      }
      setOrderNumber(result.data.orderNumber)
      updateCart([])
      setCheckoutOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place your order. Please try again.')
    }
  }

  return (
    <main className="site-shell auth-page">
      <SiteHeader />
      <section className="cart-page">
        <p className="eyebrow">YOUR SELECTION</p>
        <h1>Shopping cart</h1>
        {orderNumber ? (
          <div className="status-panel">
            <span className="empty-icon">🌿</span>
            <h2>Order request received</h2>
            <p>Your order reference is <strong>{orderNumber}</strong>.</p>
            <p>No online payment was taken. Your order request has been saved.</p>
            <Link className="primary-button" to="/">Continue shopping</Link>
          </div>
        ) : cart.length === 0 ? (
          <div className="status-panel">
            <span className="empty-icon">🪴</span>
            <h2>Your cart is empty</h2>
            <p>Explore the collection and add a plant to get started.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/', { state: { scrollTo: 'plants' } })}>Browse plants</button>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cart.map((item) => (
                <article className="cart-item" key={item.plant._id}>
                  <img src={item.plant.imageUrl} alt={item.plant.name} />
                  <div className="cart-item-info">
                    <h2>{item.plant.name}</h2>
                    <p>{formatPrice(item.plant.price)} each</p>
                    {stockById[item.plant._id] !== undefined && (
                      <p className={stockById[item.plant._id] < 1 || item.quantity > stockById[item.plant._id] ? 'auth-message auth-error' : 'cart-stock-note'} role={stockById[item.plant._id] < 1 || item.quantity > stockById[item.plant._id] ? 'alert' : 'status'}>
                        {stockById[item.plant._id] < 1
                          ? 'Out of stock'
                          : item.quantity > stockById[item.plant._id]
                            ? `Only ${stockById[item.plant._id]} available — reduce quantity`
                            : `${stockById[item.plant._id]} available in stock`}
                      </p>
                    )}
                    <label className="cart-quantity">
                      Quantity
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={item.quantity}
                        onChange={(event) => changeQuantity(item.plant._id, Number(event.target.value))}
                      />
                    </label>
                    <button className="cart-remove-button" type="button" onClick={() => updateCart(cart.filter((cartItem) => cartItem.plant._id !== item.plant._id))}>Remove</button>
                  </div>
                  <strong className="cart-line-total">{formatPrice(item.plant.price * item.quantity)}</strong>
                </article>
              ))}
            </div>
            <aside className="cart-summary">
              <h2>Order summary</h2>
              <div className="cart-summary-row"><span>Items</span><span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
              <div className="cart-summary-row"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
              <p className="cart-note">Delivery charges, if applicable, will be confirmed separately.</p>
              {stockLoading && <p className="cart-stock-note" role="status">Checking plant availability…</p>}
              {stockCheckError && <p className="auth-message auth-error" role="alert">{stockCheckError}</p>}
              {unavailableItems.length > 0 && (
                <p className="auth-message auth-error" role="alert">
                  Some plants are out of stock or your selected quantity exceeds available stock. Update your cart before checkout.
                </p>
              )}
              {error && <p className="auth-message auth-error" role="alert">{error}</p>}
              <button
                className="primary-button cart-checkout-button"
                type="button"
                disabled={stockLoading || Boolean(stockCheckError) || unavailableItems.length > 0}
                onClick={() => {
                  setError('')
                  setCheckoutOpen(true)
                }}
              >
                {stockLoading ? 'Checking stock…' : unavailableItems.length > 0 ? 'Stock unavailable' : 'Proceed to checkout'}
              </button>
            </aside>
          </div>
        )}
        {checkoutOpen && cart.length > 0 && (
          <form className="checkout-card" onSubmit={placeOrder}>
            <h2>Checkout details</h2>
            <p>Submit an order request. No online payment is collected in this version.</p>
            <label className="auth-field">Full name
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} minLength={2} maxLength={80} required />
            </label>
            <label className="auth-field">Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
            </label>
            <label className="auth-field">Mobile number
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" minLength={9} maxLength={20} pattern="[+()0-9 -]{9,20}" placeholder="e.g. 077 123 4567" required />
            </label>
            <label className="auth-field">Delivery address
              <textarea value={address} onChange={(event) => setAddress(event.target.value)} minLength={8} maxLength={500} required rows={3} />
            </label>
            <p className="cart-checkout-total">Total: {formatPrice(total)}</p>
            <button className="primary-button auth-submit" type="submit">Place demo order</button>
            <button className="cart-remove-button" type="button" onClick={() => setCheckoutOpen(false)}>Cancel</button>
          </form>
        )}
      </section>
      <footer className="site-footer">
        <Link className="brand" to="/">plantorai<span>.</span></Link>
        <p>Make room for nature.</p>
        <span>Plant marketplace</span>
      </footer>
    </main>
  )
}


/* -------------------- Admin Dashboard -------------------- */

type AdminSummary = {
  plantCount: number
  orderCount: number
  customerCount: number
  pendingOrders: number
  lowStockCount: number
  recentOrders: AdminOrder[]
}

type AdminOrder = {
  _id: string
  orderNumber: string
  customerName: string
  email: string
  phone: string
  subtotal: number
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled'
  createdAt: string
  items: Array<{ name: string; quantity: number; unitPrice: number }>
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Indoor')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('10')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sunlight, setSunlight] = useState('Indirect light')
  const [editingPlantId, setEditingPlantId] = useState('')
  const [editDraft, setEditDraft] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    imageUrl: '',
    sunlight: '',
    stock: '0',
  })
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryCategory, setInventoryCategory] = useState('')
  const [restockAmounts, setRestockAmounts] = useState<Record<string, string>>({})
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('')

  const filteredPlants = plants.filter((plant) => {
    const query = inventorySearch.trim().toLowerCase()
    const matchesQuery = !query || [plant.name, plant.category, plant.description].some((value) => value?.toLowerCase().includes(query))
    return matchesQuery && (!inventoryCategory || plant.category === inventoryCategory)
  })
  const inventoryCategories = [...new Set(plants.map((plant) => plant.category))].sort()
  const filteredOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase()
    const matchesQuery = !query || [order.orderNumber, order.customerName, order.email, order.phone].some((value) => value?.toLowerCase().includes(query))
    return matchesQuery && (!orderStatusFilter || order.status === orderStatusFilter)
  })

  const adminApiUrl = API_URL.replace(/\/api\/plants\/?$/, '/api/admin')

  async function adminFetch(path: string, init: RequestInit = {}) {
    const token = localStorage.getItem('plantorai_token')
    if (!token) {
      navigate('/login', { replace: true, state: { from: '/admin' } })
      throw new Error('Please log in with an administrator account.')
    }
    const response = await fetch(`${adminApiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    })
    const result = await response.json()
    if (response.status === 401) {
      navigate('/login', { replace: true, state: { from: '/admin' } })
      throw new Error('Your session expired. Please log in again.')
    }
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Admin request failed.')
    }
    return result
  }

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const [dashboardResult, plantsResult, ordersResult] = await Promise.all([
        adminFetch('/dashboard'),
        adminFetch('/plants'),
        adminFetch('/orders'),
      ])
      setSummary(dashboardResult.data as AdminSummary)
      setPlants(plantsResult.data as Plant[])
      setOrders(ordersResult.data as AdminOrder[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  async function createPlant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await adminFetch('/plants', {
        method: 'POST',
        body: JSON.stringify({
          name,
          category,
          price: Number(price),
          stock: Number(stock),
          description,
          imageUrl,
          sunlight,
        }),
      })
      setName('')
      setPrice('')
      setStock('10')
      setDescription('')
      setImageUrl('')
      setMessage('Plant added successfully.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add plant.')
    } finally {
      setSaving(false)
    }
  }

  async function updatePlantStock(plant: Plant, nextStock: number) {
    setError('')
    setMessage('')
    try {
      await adminFetch(`/plants/${plant._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: nextStock }),
      })
      setMessage(`${plant.name} stock updated and saved to the database.`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update stock.')
    }
  }

  async function restockPlant(plant: Plant) {
    const amount = Number(restockAmounts[plant._id] || 0)
    if (!Number.isInteger(amount) || amount < 1) {
      setError('Enter a whole-number restock amount greater than zero.')
      return
    }
    setError('')
    setMessage('')
    try {
      await adminFetch(`/plants/${plant._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: (plant.stock ?? 100) + amount }),
      })
      setRestockAmounts((current) => ({ ...current, [plant._id]: '' }))
      setMessage(`${plant.name}: added ${amount} to stock. New stock saved to the database.`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to restock plant.')
    }
  }

  function startEditingPlant(plant: Plant) {
    setError('')
    setMessage('')
    setEditingPlantId(plant._id)
    setEditDraft({
      name: plant.name,
      category: plant.category,
      price: String(plant.price),
      description: plant.description || '',
      imageUrl: plant.imageUrl || '',
      sunlight: plant.sunlight || '',
      stock: String(plant.stock ?? 100),
    })
  }

  async function savePlantChanges(plant: Plant) {
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await adminFetch(`/plants/${plant._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editDraft.name.trim(),
          category: editDraft.category.trim(),
          price: Number(editDraft.price),
          description: editDraft.description.trim(),
          imageUrl: editDraft.imageUrl.trim(),
          sunlight: editDraft.sunlight.trim(),
          stock: Number(editDraft.stock),
        }),
      })
      setEditingPlantId('')
      setMessage(`${editDraft.name.trim()} saved successfully. Changes are now stored in the database.`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save plant changes.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePlant(plant: Plant) {
    if (!window.confirm(`Delete ${plant.name}? This cannot be undone.`)) return
    setError('')
    setMessage('')
    try {
      await adminFetch(`/plants/${plant._id}`, { method: 'DELETE' })
      setMessage(`${plant.name} deleted.`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete plant.')
    }
  }

  async function updateOrderStatus(orderId: string, status: AdminOrder['status']) {
    setError('')
    setMessage('')
    try {
      await adminFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setMessage('Order status updated.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update order status.')
    }
  }

  return (
    <main className="site-shell auth-page">
      <SiteHeader />
      <section className="admin-page">
        <p className="eyebrow">PLANTORAI MANAGEMENT</p>
        <h1>Admin dashboard</h1>
        <p className="section-description">Manage plant listings, inventory and customer orders.</p>

        {loading ? (
          <div className="status-panel" role="status"><span className="loader" /><p>Loading admin dashboard…</p></div>
        ) : error && !summary ? (
          <div className="status-panel error-panel" role="alert">
            <h2>Admin access unavailable</h2>
            <p>{error}</p>
            <p>Only an account with the admin role can access this dashboard.</p>
            <button className="primary-button" type="button" onClick={() => void loadDashboard()}>Try again</button>
          </div>
        ) : (
          <>
            {error && <p className="auth-message auth-error" role="alert">{error}</p>}
            {message && <p className="auth-message auth-success" role="status">{message}</p>}
            {summary && (
              <div className="admin-stats-grid">
                <article className="admin-stat"><span>Total plants</span><strong>{summary.plantCount}</strong></article>
                <article className="admin-stat"><span>Total orders</span><strong>{summary.orderCount}</strong></article>
                <article className="admin-stat"><span>Customers</span><strong>{summary.customerCount}</strong></article>
                <article className="admin-stat"><span>Pending orders</span><strong>{summary.pendingOrders}</strong></article>
                <article className="admin-stat"><span>Low stock (5 or less)</span><strong>{summary.lowStockCount}</strong></article>
              </div>
            )}

            <section className="admin-section">
              <h2>Add a plant</h2>
              <form className="admin-plant-form" onSubmit={createPlant}>
                <label className="auth-field">Plant name<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required /></label>
                <label className="auth-field">Category<input value={category} onChange={(e) => setCategory(e.target.value)} minLength={2} maxLength={60} required /></label>
                <label className="auth-field">Price (LKR)<input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="0.01" required /></label>
                <label className="auth-field">Initial stock<input type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" max="1000000" step="1" required /></label>
                <label className="auth-field admin-wide-field">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} minLength={5} maxLength={2000} rows={3} required /></label>
                <label className="auth-field admin-wide-field">Image URL (optional)<input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} maxLength={2000} /></label>
                <label className="auth-field">Sunlight<input value={sunlight} onChange={(e) => setSunlight(e.target.value)} maxLength={100} /></label>
                <button className="primary-button admin-form-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add plant'}</button>
              </form>
            </section>

            <section className="admin-section">
              <h2>Plant inventory</h2>
              <div className="admin-inventory-filters">
                <label className="auth-field">Search inventory<input type="search" placeholder="Plant name, category, description..." value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} /></label>
                <label className="auth-field">Filter category<select value={inventoryCategory} onChange={(event) => setInventoryCategory(event.target.value)}><option value="">All categories</option>{inventoryCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              </div>
              {plants.length === 0 ? <p>No plants found.</p> : filteredPlants.length === 0 ? <p>No plants match your search/filter.</p> : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Plant</th><th>Price</th><th>Available stock</th><th>Actions</th></tr></thead>
                    <tbody>{filteredPlants.map((plant) => (
                      <Fragment key={plant._id}>
                        <tr>
                          <td><strong>{plant.name}</strong><small>{plant.category}</small></td>
                          <td>{formatPrice(plant.price)}</td>
                          <td><input aria-label={`${plant.name} stock`} className="admin-stock-input" type="number" min="0" max="1000000" defaultValue={plant.stock ?? 100} id={`stock-${plant._id}`} /></td>
                          <td><div className="admin-row-actions">
                            <button className="admin-small-button" type="button" onClick={() => {
                              const input = document.getElementById(`stock-${plant._id}`) as HTMLInputElement | null
                              if (!input || !Number.isInteger(Number(input.value)) || Number(input.value) < 0) {
                                setError('Stock must be a whole number greater than or equal to zero.')
                                return
                              }
                              void updatePlantStock(plant, Number(input.value))
                            }}>Set stock</button>
                            <input aria-label={`Restock amount for ${plant.name}`} className="admin-stock-input admin-restock-input" type="number" min="1" max="1000000" placeholder="+ Qty" value={restockAmounts[plant._id] ?? ''} onChange={(event) => setRestockAmounts((current) => ({ ...current, [plant._id]: event.target.value }))} />
                            <button className="admin-small-button" type="button" onClick={() => void restockPlant(plant)}>Restock</button>
                            <button className="admin-small-button" type="button" onClick={() => startEditingPlant(plant)}>{editingPlantId === plant._id ? 'Editing…' : 'Edit'}</button>
                            <button className="admin-small-button admin-delete-button" type="button" onClick={() => void deletePlant(plant)}>Delete</button>
                          </div></td>
                        </tr>
                        {editingPlantId === plant._id && (
                          <tr key={`${plant._id}-edit`}>
                            <td colSpan={4}>
                              <form className="admin-plant-form" onSubmit={(event) => { event.preventDefault(); void savePlantChanges(plant) }}>
                                <label className="auth-field">Plant name<input value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} minLength={2} maxLength={100} required /></label>
                                <label className="auth-field">Category<input value={editDraft.category} onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })} minLength={2} maxLength={60} required /></label>
                                <label className="auth-field">Price (LKR)<input type="number" value={editDraft.price} onChange={(event) => setEditDraft({ ...editDraft, price: event.target.value })} min="0" step="0.01" required /></label>
                                <label className="auth-field">Available stock<input type="number" value={editDraft.stock} onChange={(event) => setEditDraft({ ...editDraft, stock: event.target.value })} min="0" max="1000000" step="1" required /></label>
                                <label className="auth-field admin-wide-field">Description<textarea value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} minLength={5} maxLength={2000} rows={3} required /></label>
                                <label className="auth-field admin-wide-field">Image URL (optional)<input type="url" value={editDraft.imageUrl} onChange={(event) => setEditDraft({ ...editDraft, imageUrl: event.target.value })} maxLength={2000} /></label>
                                <label className="auth-field">Sunlight<input value={editDraft.sunlight} onChange={(event) => setEditDraft({ ...editDraft, sunlight: event.target.value })} maxLength={100} /></label>
                                <div className="admin-row-actions admin-wide-field">
                                  <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving changes…' : 'Save changes'}</button>
                                  <button className="admin-small-button" type="button" onClick={() => setEditingPlantId('')}>Cancel</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="admin-section">
              <h2>Customer orders</h2>
              <div className="admin-inventory-filters">
                <label className="auth-field">Search orders<input type="search" placeholder="Order number, customer, email, phone..." value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} /></label>
                <label className="auth-field">Filter status<select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}><option value="">All statuses</option><option>Pending</option><option>Processing</option><option>Completed</option><option>Cancelled</option></select></label>
              </div>
              {orders.length === 0 ? <p>No orders have been placed yet.</p> : filteredOrders.length === 0 ? <p>No orders match your search/filter.</p> : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Order</th><th>Customer</th><th>Items / total</th><th>Status</th></tr></thead>
                    <tbody>{filteredOrders.map((order) => (
                      <tr key={order._id}>
                        <td><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></td>
                        <td>{order.customerName}<small>{order.email}</small><small>{order.phone}</small></td>
                        <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items<small>{formatPrice(order.subtotal)}</small></td>
                        <td><select aria-label={`Status for ${order.orderNumber}`} value={order.status} onChange={(e) => void updateOrderStatus(order._id, e.target.value as AdminOrder['status'])}>
                          <option>Pending</option><option>Processing</option><option>Completed</option><option>Cancelled</option>
                        </select></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
      <footer className="site-footer">
        <Link className="brand" to="/">plantorai<span>.</span></Link>
        <p>Make room for nature.</p>
        <span>Admin tools</span>
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
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/account" element={<ProtectedAccountPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/cart" element={<CartPage />} />
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