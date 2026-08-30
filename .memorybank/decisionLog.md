# Decision Log (murali-ecommerce-backend)

## Decision 1: Static Route for Uploads
- Mount `/uploads` static route to serve locally uploaded product images directly from the backend server at `http://localhost:5000/uploads/...`.

## Decision 2: Standard JSON Envelopes
- Enforce standard JSON envelope structure `{ status: boolean, data?: any, message?: string }` across all controller responses.
