# PlantorAI 🌿

**Discover your perfect indoor plants.**

PlantorAI is a plant marketplace web application for browsing plants, viewing plant details, searching and filtering the catalogue, managing a cart, placing demo orders, and supporting customer, seller, and admin workflows.

## Current features

- Browse approved and active plant listings
- Search and filter plants by category and price
- View plant details and basic recommendations
- Shopping cart and checkout flow with orders stored by the backend (demo checkout; no real payment gateway)
- Customer registration, login, and JWT authentication
- Role-based customer, seller, and admin access
- Seller dashboard for managing owned listings, stock, and relevant orders
- Admin dashboard for catalogue/inventory, orders, user roles and account status, and plant-listing moderation
- Backend checks for authentication, role permissions, seller ownership, stock availability, and order data scoping
- AI plant-care assistant MVP at `/plant-care`, backed by `POST /api/plant-care/chat` and Gemini API (requires a server-side `GEMINI_API_KEY`)

## Tech stack

**Frontend:** React, TypeScript, Vite, React Router, CSS

**Backend:** Node.js, Express.js, MongoDB Atlas, Mongoose, bcryptjs, JSON Web Tokens (JWT), Vitest, Supertest

## Getting started

### Prerequisites
- Node.js and npm
- MongoDB Atlas account or another configured MongoDB database

### 1. Clone and install frontend dependencies

```bash
git clone https://github.com/duminduue/plantorai.git
cd plantorai
npm install
```

The frontend uses the API URL configured in `src/config`. If you need to override it, use a root `.env` file with the expected `VITE_API_URL` value. Vite variables are exposed in the client bundle; never put secrets in any `VITE_*` variable.

### 2. Configure the backend

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and configure at least:
- `MONGODB_URI`
- `JWT_SECRET` (use a strong random value of at least 32 characters)
- `GEMINI_API_KEY` (Google AI Studio key; required for the AI assistant)

Keep `.env` private and never commit real credentials.

### 3. Run the backend

From the `server` directory:

```bash
npm run dev
```

### 4. Run the frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Open the local URL printed by Vite. The backend defaults to `http://localhost:5000`.

## Documentation and project status

The consolidated project overview, setup guide, architecture summary, phase roadmap, testing evidence, known limitations, and deployment checklist are maintained in one document:

**[PlantorAI Master Project Documentation](docs/MASTER-PROJECT-DOCUMENTATION.md)**

Latest local verification record: 55 backend tests passed, production build successful, 7/7 manual regression workflows passed, and lint reported 0 errors with 2 remaining warnings. See the master document for scope and limitations. See the master document for details and limitations.

## Security reminders

- Public registration creates customer accounts only.
- Seller/admin roles must be assigned through a secured administrative process.
- Keep MongoDB and AI provider credentials on the server only.
- Do not commit `.env` files or expose secrets in frontend configuration.

## Author

Dumindu Ekanayaka

GitHub: https://github.com/duminduue
