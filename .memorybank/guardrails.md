# Backend Guardrails & Inviolable Non-Regression Rules

## 1. Zero-Regression Policy
- Any changes to routes, models, controllers, or database schemas MUST be backward-compatible and MUST NOT break existing frontend or admin functionality.

## 2. Inviolable Backend Rules
1. **API Contracts**: Always preserve existing endpoint paths and response envelopes `{ status: boolean, data?: any, message?: string }`.
2. **Static Route Mount**: Never alter or unmount `app.use('/uploads', express.static(...))` as both Frontend and Admin depend on static media delivery.
3. **Database Schema Continuity**: Never drop or destructively rename existing fields on `Product`, `Category`, `MainCategory`, `User`, `Cart`, or `Order`.
4. **Error Handling**: Always return structured errors with appropriate HTTP status codes rather than unhandled promise crashes.
5. **Port & CORS**: Maintain port `5000` and CORS permissions for `http://localhost:3000` (frontend) and `http://localhost:5173` (admin).
