# Phase 5 — AI Plant-Care Assistant

**Status:** Implemented; see [Phase 5 completion notes](PHASE-5-COMPLETION.md) for owner-reported verification and remaining close-out checks.

## Goal
Add a small, demonstrable assistant that answers basic plant-care questions using the selected plant's known catalogue details and the user's question.

## Locked MVP scope
1. Dedicated Plant Care Assistant page at `/plant-care`.
2. Text input for a plant-care question and an optional plant name.
3. Backend endpoint `POST /api/plant-care/chat` with request validation and a structured answer.
4. Server-side Gemini integration using `GEMINI_API_KEY`; secrets are not placed in frontend variables.
5. Loading, empty-input, and error states, plus readable formatting for headings and lists.
6. Limitations disclaimer advising users to verify important care, toxicity, disease, and treatment decisions.
7. Automated tests for input validation, mocked provider behavior, rate limiting, and service failures.
8. Quick-question buttons for watering, yellow leaves, sunlight, and root rot, plus Clear Chat.

## Out of scope for the MVP
- Image-based disease detection.
- Plant diagnosis from photos.
- Voice chat.
- User conversation history or long-term memory.
- Autonomous watering, sensor/IoT integrations, or smart-home controls.
- Subscription/billing or paid AI features.
- Training a custom AI model.

## Implementation sequence
1. Confirm the AI provider and API access approach before coding provider-specific calls.
2. Add backend configuration validation and a small provider service module.
3. Add a validated, rate-conscious assistant API endpoint.
4. Build the frontend assistant UI and connect it to the endpoint.
5. Add mocked-provider API tests and run the complete existing backend test suite.
6. Run the frontend production build and manually test success, invalid input, and provider-error paths.
7. Document setup, limitations, and test evidence.

## Security and reliability requirements
- Never place provider secrets in frontend code or client-visible environment variables.
- Bound request length and reject empty or malformed input.
- Do not send credentials, customer data, order data, or unrelated account information to the provider.
- Do not claim certainty about plant toxicity, disease, or treatment when the evidence is insufficient.
- Keep existing marketplace, authentication, checkout, seller, and admin workflows working.

## Completion criteria
- A customer can submit a plant-care question and receive a useful response.
- The UI handles loading, invalid input, and provider failures.
- Provider keys are server-side only.
- Automated tests cover endpoint validation and mocked provider behavior.
- Frontend build and all backend tests pass.
- Existing core workflows pass a regression checklist.

## Close-out checks
The project owner reports 46 backend tests passing and manually verified successful Gemini responses, empty-question prevention, Quick Questions, Clear Chat, and the user-facing error shown when the backend is unavailable. Run a fresh frontend production build after the latest UI changes and regression-check the existing marketplace workflows before considering all phase checks closed. See [Phase 5 completion notes](PHASE-5-COMPLETION.md).
