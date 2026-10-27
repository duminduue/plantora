// Shared API configuration for local development and deployment.
// Set VITE_API_URL in the frontend environment to override the local default.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/plants'
