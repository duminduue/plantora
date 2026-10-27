# PlantorAI 🌿

**Discover your perfect indoor plants.**

PlantorAI is a plant discovery web application designed to help users explore indoor plants, search and filter the collection, view plant details, and receive basic plant recommendations.

## Features

- Browse the plant catalogue
- Search for plants
- Filter plants by category and price
- View individual plant details
- Explore plant recommendations
- Responsive homepage with an About section
- MongoDB-backed plant data
- Customer registration and login API with JWT authentication
- Role-based authorization middleware for customer, seller, and admin roles

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- CSS

**Backend**
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- bcryptjs password hashing
- JSON Web Tokens (JWT)

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB Atlas account or a configured MongoDB database

### 1. Clone the repository

```bash
git clone https://github.com/duminduue/plantora.git
cd plantora
```

### 2. Install frontend dependencies

From the project root:

```bash
npm install
```

The frontend uses `http://localhost:5000/api/plants` by default. To override it, create a `.env` file in the project root and set:

```env
VITE_API_URL=http://localhost:5000/api/plants
```

For deployment, set `VITE_API_URL` to the deployed backend's plant API URL in the frontend hosting environment, then rebuild/redeploy the frontend. Vite environment variables are included in the client bundle, so do not put secrets in `VITE_*` variables.

### 3. Configure the backend

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and fill in your MongoDB connection string and a strong random `JWT_SECRET` (at least 32 characters). Keep `.env` private and never commit real credentials.

### 4. Start the backend

From the `server` directory:

```bash
npm run dev
```

### 5. Start the frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## API

Base URL: `http://localhost:5000`

### Plants

- `GET /api/plants` — list plants with optional search and filters
- `GET /api/plants/:id` — get one plant
- `PATCH /api/plants/:id` — update supported plant fields (currently image URL)

### Authentication

- `POST /api/auth/register` — create a customer account; expects `{ "name": "Example User", "email": "user@example.com", "password": "at-least-8-characters" }`
- `POST /api/auth/login` — sign in; expects `{ "email": "user@example.com", "password": "your-password" }`
- `GET /api/auth/me` — return the current authenticated user; requires `Authorization: Bearer <token>`

Public registration always assigns the `customer` role. Seller/admin role assignment must be performed through a separately secured administrative process; clients cannot choose a privileged role during registration. JWTs expire after 1 day. The `authenticate` and `authorize` middleware are available for protecting future endpoints.

## Testing

### Frontend production build

Run from the project root:

```bash
npm run build
```

### Backend automated API tests

Run from the `server` directory:

```bash
npm test
```

The existing backend API tests cover API health and catalogue retrieval, search and category filters, price validation, and plant ID handling. Authentication tests should be run after the auth API has been installed locally.

## Project Status

The catalogue, search and filtering, plant details, basic recommendations, and responsive About section have been manually checked. Authentication endpoints and role middleware are the current Phase 2 implementation; run the backend tests and verify registration/login locally before treating this phase as complete.

## Future Improvements

- Production deployment
- Automated end-to-end testing
- Improved plant care information
- Additional recommendation features
- Shopping cart and checkout
- Seller and admin dashboards
- AI plant-care assistant

## Author

Dumindu Ekanayaka

GitHub: https://github.com/duminduue
