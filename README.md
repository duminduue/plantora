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
cd plantora
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
- `JWT_SECRET` (use a strong random value of at least 32 characters)\n- `GEMINI_API_KEY` (Google AI Studio key; required for the AI assistant)

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

## Testing

Frontend production build (project root):

```bash
npm run build
```

Backend automated tests (inside `server`):

```bash
npm test
```

The project owner reported that the Phase 4 frontend build succeeded and all 40 backend tests passed locally. Re-run both commands after pulling changes; these results are not a guarantee for every environment.

## Project roadmap

- **Phase 0 — Project Audit and Planning:** completed
- **Phase 1 — Core Plant Marketplace:** completed
- **Phase 2 — Authentication and User Roles:** implemented
- **Phase 3 — Shopping Cart and Checkout:** implemented; checkout uses a demo flow and does not process real payments
- **Phase 4 — Seller and Admin Dashboards:** implemented; owner-reported local verification is documented in [Phase 4 completion notes](docs/PHASE-4-COMPLETION.md)
- **Phase 5 — AI Plant-Care Assistant:** initial endpoint, chat UI, and automated endpoint tests added; not complete until local build/tests and a real Gemini API request succeed. See [Phase 5 MVP plan](docs/PHASE-5-PLAN.md)
- **Phase 6 — Testing and Reliability:** planned
- **Phase 7 — Deployment and Documentation:** planned

## Phase 5 status

The initial AI Plant-Care Assistant implementation is in progress. Open `/plant-care` in the frontend. The backend uses `GEMINI_API_KEY` from `server/.env`; never put this key in frontend environment variables or commit it. The endpoint validates input, limits requests in memory, handles provider errors, and returns a limitations disclaimer. The plan intentionally excludes image diagnosis, voice, conversation history, IoT controls, and custom model training. **Phase 5 is not complete** until the owner runs the local build and tests, then verifies a real API response and failure cases.

## Security reminders

- Public registration creates customer accounts only.
- Seller/admin roles must be assigned through a secured administrative process.
- Keep MongoDB and AI provider credentials on the server only.
- Do not commit `.env` files or expose secrets in frontend configuration.

## Author

Dumindu Ekanayaka

GitHub: https://github.com/duminduue
