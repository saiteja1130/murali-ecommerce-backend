# Backend Agent Instructions & Strict Non-Regression Mandate

REST API backend (`murali-ecommerce-backend`) built with **Node.js**, **Express**, and **MongoDB**.

---

## 🚨 MANDATORY ZERO-REGRESSION POLICY
**No API modification may break existing frontend (`port 3000`) or admin (`port 5173`) contracts.**

### Inviolable Backend Rules:
1. **API Envelope Contracts**: Maintain `{ status: boolean, data?: any, message?: string }`.
2. **Static Route `/uploads`**: Never remove or alter static file delivery for `/uploads` on port `5000`.
3. **Database Schema Backwards Compatibility**: Never destructively mutate or remove existing fields on `User`, `Product`, `Category`, `MainCategory`, `Cart`, or `Order`.
4. **CORS & Port Alignment**: Maintain port `5000` and CORS permissions for ports `3000` and `5173`.

Refer to `.memorybank/guardrails.md` for complete rules.
