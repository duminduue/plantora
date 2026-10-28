# Phase 4 — Seller and Admin Dashboards

**Status:** Implemented; local verification reported by the project owner.

## Seller features
- View listings owned by the signed-in seller.
- Create plant listings; new listings enter moderation as pending/inactive.
- Edit plant details and prices; content edits return the listing to moderation.
- Update stock quantities.
- Deactivate listings.
- View orders containing the seller's own products.
- Seller order responses contain only relevant items and a seller-specific subtotal; customer contact and delivery details and the full order subtotal are not returned by the seller orders endpoint.

## Admin features
- Access admin-only dashboard endpoints and UI.
- View and manage users, account active status, and roles.
- Review pending plant listings and approve or reject them.
- View marketplace summary information, including pending listings, seller count, and inactive users.
- Manage catalogue inventory and orders through the existing admin interface.

## Security notes
- Seller and admin endpoints require authentication and backend role authorization.
- Seller listing operations are restricted to listings owned by the authenticated seller.
- Public catalogue results exclude inactive or unapproved listings, while supporting legacy records without a moderation status.
- Public registration creates customer accounts only; clients cannot self-assign seller/admin roles.

## Verification
The project owner reported:
- Frontend production build succeeded.
- Backend automated tests: 40 passed.

These are owner-reported local results; this document does not claim an independent test run.

## Completion criteria
Seller and admin workflows are implemented, backend permissions are enforced, seller order data is scoped to the seller, and the owner-reported build/test checks passed.

## Known limitations / follow-up
- Perform a fresh local regression run after any subsequent changes.
- Production deployment, end-to-end browser coverage, and real payment integration are outside this phase.
