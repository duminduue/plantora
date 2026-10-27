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

```bash
npm install
```

The frontend uses `http://localhost:5000/api/plants` by default. To override it, create a `.env` file in the project root and set:

```env
VITE_API_URL=http://localhost:5000/api/plants
```

For deployment, set `VITE_API_URL` to the deployed backend's plant API URL in the frontend hosting environment, then rebuild/redeploy the frontend. Vite environment variables are included in the client bundle, so do not put secrets in `VITE_*` variables.

### 3. Configure the backend

Navigate to the server directory:

```bash
cd server
npm install
```

Create a `.env` file inside `server/` and configure the environment variables required by `server.js`, including your MongoDB connection string and backend port.

**Do not commit `.env` or database credentials to GitHub.**

### 4. Start the backend

Use the start command configured in `server/package.json`.

### 5. Start the frontend

Open a second terminal in the project root and run:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## API

The local plant API endpoint is:

`http://localhost:5000/api/plants`

## Project Status

The main catalogue, search and filtering, plant details, basic recommendations, and responsive About section have been manually checked.

Build verification and deployment readiness should be confirmed for the current version before production release.

## Future Improvements

- Production deployment
- Automated end-to-end testing
- Improved plant care information
- Additional recommendation features

## Author

Dumindu Ekanayaka

GitHub: https://github.com/duminduue
