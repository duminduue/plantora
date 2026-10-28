# Phase 5 — AI Plant-Care Assistant

**Status:** Implemented; owner-reported local verification completed for the core AI flow. A fresh frontend production build after the latest Quick Questions and Clear Chat UI changes is still recommended before treating the phase as fully closed.

## Scope delivered

1. **AI API selected and integrated:** Google Gemini API, called from the backend.
2. **Backend endpoint:** `POST /api/plant-care/chat`.
3. **Chat interface:** Dedicated `/plant-care` page with question input, optional plant name, loading/error states, and formatted answers.
4. **Plant-care topics:** The prompt supports watering, sunlight, soil, humidity, and common plant problems. Quick-question buttons cover watering, yellow leaves, sunlight, and root rot.
5. **Validation and errors:** Empty and over-length inputs are rejected; provider and network failures return user-facing errors.
6. **Server-side secret:** Uses `GEMINI_API_KEY` from `server/.env`. The key must never be committed or exposed through a `VITE_*` variable.
7. **Usage limits:** In-memory limit of 10 requests per IP per 10-minute window.
8. **Testing:** The project owner reported 46 backend tests passing. The owner manually tested normal plant-care questions, the empty-question UI state, the Quick Questions buttons, Clear Chat, and a backend-unavailable error state. After restarting the backend, the owner reported that AI answers worked again.
9. **Limitations:** The UI explains that advice may be incomplete or incorrect and that important toxicity, disease, and treatment decisions should be checked against a reliable horticultural source.

## Verification evidence

The following are **reported by the project owner**, not independently run by this document's author:

- Backend automated test suite: 46 passed.
- Real Gemini responses returned for plant-care questions, including Monstera watering and yellow leaves with wet soil.
- Empty question was prevented by the frontend.
- Quick Questions produced requests and Clear Chat cleared the conversation.
- When the backend was stopped, the frontend displayed a user-friendly service error instead of crashing.
- After the backend was restarted, the owner reported that the AI assistant worked again.

## Known limitations

- The rate limiter is in-memory and is not shared across multiple server instances; restart resets its counters.
- There is no conversation persistence, image-based diagnosis, voice interface, IoT control, or custom-trained model.
- AI guidance can be wrong and is not a substitute for a qualified horticultural source.
- Run `npm run build` from the project root after pulling the latest UI changes, and run `npm test` inside `server`, to confirm the current checkout remains healthy.

## Completion decision

The integrated AI service has returned useful plant-care guidance in manual tests and the owner reports the backend tests passing. The remaining close-out check is a fresh frontend production build after the latest UI changes, plus a regression check of the existing marketplace workflows. Do not claim those checks passed until they have actually been run.
