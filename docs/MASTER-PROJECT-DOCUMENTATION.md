# PlantorAI — Master Project Documentation

**Project owner:** Dumindu Ekanayaka  
**Repository:** https://github.com/duminduue/plantorai  
**Document status:** Living project document  
**Last updated:** 29 October 2026

## 1. Project overview

PlantorAI is a plant marketplace web application for browsing plants, viewing plant details, searching and filtering listings, managing a shopping cart, and supporting customer, seller, and administrator workflows. It also includes an MVP AI plant-care assistant.

The checkout is a demo flow. It creates orders and updates inventory, but it does not process real payments.

## 2. Objectives and scope

The current project aims to provide:
- A browsable plant catalogue with search and filtering.
- Customer registration and login.
- Role-based customer, seller, and administrator functionality.
- Cart, checkout, order records, and stock validation.
- Seller tools for managing owned listings, inventory, and relevant orders.
- Admin tools for catalogue/inventory, orders, user accounts and roles, and listing moderation.
- An AI plant-care assistant with input validation and user-facing error handling.
- Automated backend tests and repeatable local setup instructions.

## 3. Technology stack

- **Frontend:** React, TypeScript, Vite, React Router, CSS.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB with Mongoose (MongoDB Atlas or another configured MongoDB deployment).
- **Authentication:** bcryptjs and JSON Web Tokens (JWT).
- **Testing:** Vitest and Supertest.
- **AI assistant:** Google Gemini API called from the backend.

## 4. Application features

### Marketplace
- Browse active and approved plant listings.
- Search and filter the catalogue by category and price.
- Open plant detail pages and view basic recommendations.

### Authentication and access control
- Customer registration and login.
- JWT-based authentication.
- Customer, seller, and admin roles.
- Backend authorization checks, seller ownership checks, and order data scoping.

Public registration should create customer accounts only. Seller/admin roles must be assigned through a secured administrative process.

### Cart and checkout
- Cart quantity and subtotal calculations.
- Stock availability validation.
- Demo order creation and stock deduction.
- Backend validation for invalid plant IDs, quantities, and insufficient stock.
- Checkout is not connected to a real payment gateway.

### Seller and admin dashboards
- Sellers manage their own plant listings, stock, and relevant orders.
- Admins manage catalogue/inventory, orders, user roles and account status, and plant-listing moderation.
- Admin restocking validates quantities and records stock movements.

### AI Plant-Care Assistant
- UI route: `/plant-care`.
- API endpoint: `POST /api/plant-care/chat`.
- Supports plant-care questions such as watering, sunlight, soil, humidity, yellow leaves, and common plant problems.
- Includes quick questions, loading/error feedback, and Clear Chat.
- Uses the server-side `GEMINI_API_KEY`.
- Validates empty and over-length input and handles provider/network errors.
- In-memory usage limit: 10 requests per IP per 10-minute window.

**AI limitation:** Advice may be incomplete or wrong. Important toxicity, disease, or treatment decisions should be checked with a reliable horticultural source. The in-memory rate limiter resets on server restart and is not shared across multiple server instances.

## 5. Local setup

### Prerequisites
- Node.js and npm.
- MongoDB Atlas account or another configured MongoDB database.
- A Google AI Studio API key if testing the AI assistant.

### Install dependencies
From the repository root:

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
```

### Environment configuration
Copy `server/.env.example` to `server/.env` and configure:
- `MONGODB_URI`
- `JWT_SECRET` — use a strong random secret of at least 32 characters.
- `GEMINI_API_KEY` — required for the AI assistant.

Keep real credentials private. Never commit `.env` files or expose secrets through frontend `VITE_*` variables.

The frontend API URL is configured under `src/config`. If overriding it, use the expected `VITE_API_URL` in a root environment file; frontend environment values are exposed in the browser bundle, so they must not contain secrets.

### Run the application
Start the backend from the `server` directory:

```bash
npm run dev
```

In a second terminal, from the repository root, start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite. The backend default URL is `http://localhost:5000`.

## 6. Build, lint, and test commands

From the repository root:

```bash
npm run build
npm run lint
```

Run backend tests from the `server` directory:

```bash
npm test
```

The root package does not currently provide an `npm test` script; run backend tests inside `server`.

## 7. Phase roadmap and status

| Phase | Scope | Status |
|---|---|---|
| Phase 0 | Project audit and planning | Reported complete |
| Phase 1 | Core plant marketplace | Implemented |
| Phase 2 | Authentication and user roles | Implemented |
| Phase 3 | Shopping cart and demo checkout | Implemented; no real payments |
| Phase 4 | Seller and admin dashboards | Implemented; owner-reported local verification |
| Phase 5 | AI plant-care assistant | Implemented and manually exercised; see evidence below |
| Phase 6 | Testing and reliability | Owner-reported test checklist completed; two lint warnings remain |
| Phase 7 | Deployment and production readiness | Planned; not yet verified as deployed |

Status reflects the available project history and owner-reported checks. It does not imply that every production, security, or deployment scenario has been independently audited.

## 8. Testing and verification record

The following results were reported by the project owner from the local checkout around 28 October 2026. They were not independently executed by this document's author.

### Automated tests
- Backend test files: `server/tests/api.test.js` and `server/tests/plantCare.test.js`.
- Latest reported backend test run: **55 tests passed**.
- Reported test coverage includes plant listing/search filters, invalid and missing IDs, order validation and creation, stock checks, JWT/authentication, customer/admin permissions, seller ownership isolation, seller order privacy, admin user management, stock history, checkout consistency, duplicate cart lines, restock validation, and AI endpoint validation/failure handling.

### Production build and lint
- Owner-reported `npm run build`: successful.
- Owner-reported `npm run lint`: **0 errors and 2 warnings**.
- The remaining warnings are React `set-state-in-effect` warnings in Admin and Seller dashboard data-loading effects. They were left in place rather than suppressed because a safe behavior-preserving change has not yet been verified.

### Manual regression workflows
The owner reports all **7/7** of the following workflows passed:
1. Login / Register / Logout.
2. Marketplace plant loading and search/filter.
3. Cart quantity, stock validation, and subtotal.
4. Checkout order creation and stock deduction.
5. Seller dashboard plant and order management.
6. Admin dashboard users, stock, and moderation.
7. Plant Care AI valid requests and error handling.

### What this evidence means
These are recorded as owner-reported results. Automated tests, a successful production build, and the seven manual workflows are positive evidence, but they do not constitute an independent security audit or proof that every edge case is covered.

## 9. Known limitations and follow-up work

- Two lint warnings remain in dashboard data-loading effects; review and fix only if a behavior-safe solution is clear.
- Add targeted tests if further uncovered role-boundary, failure, or concurrency cases are identified.
- The checkout is a demo flow and does not process real payments.
- AI rate limiting is in-memory and does not coordinate between multiple backend instances.
- AI advice can be incorrect; no image-based diagnosis, voice interface, IoT control, custom-trained model, or persistent conversation history is claimed.
- Phase 7 production deployment, environment configuration, live database connectivity, security settings, and live-site smoke tests remain to be planned and verified.

## 10. Security checklist

- Keep `MONGODB_URI`, `JWT_SECRET`, and `GEMINI_API_KEY` on the server.
- Never commit real `.env` credentials.
- Keep public registration restricted to customer accounts.
- Verify seller ownership and admin authorization on the backend, not only in the UI.
- Use HTTPS and production-appropriate secret management before public deployment.
- Review CORS, rate limiting, logging, database access permissions, and error responses before deployment.
- Do not describe demo checkout as real payment processing.

## 11. Next phase: deployment and production readiness

Before public launch:
1. Choose and configure frontend and backend hosting.
2. Configure production environment variables and secure database access.
3. Set the production frontend API URL and backend CORS allowlist.
4. Verify HTTPS, authentication, role permissions, and AI provider configuration.
5. Run the production build, backend tests, lint, and a live-site smoke test.
6. Confirm logs and error handling do not expose secrets.
7. Document deployment steps and rollback/recovery procedure.

## 12. Author and repository

**Author:** Dumindu Ekanayaka  
**GitHub:** https://github.com/duminduue  
**Repository:** https://github.com/duminduue/plantorai
