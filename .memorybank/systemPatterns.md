# System Patterns (murali-ecommerce-backend)

## 1. Directory Structure
```
murali-ecommerce-backend
 ├── config/ (Database & environment setup)
 ├── controllers/ (Request handler business logic)
 ├── middlewares/ (JWT authentication, error handling, upload middleware)
 ├── models/ (Mongoose schemas: User, Product, Category, MainCategory, Cart, Order)
 ├── routes/ (Express route definitions)
 ├── uploads/ (Physical directory for uploaded product and banner images)
 └── server.js (Express application bootstrap)
```

## 2. Static File Serving
- `app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));`
- Uploaded files are served from `http://localhost:5000/uploads/...`.

## 3. Response Envelope Standard
```json
{
  "status": true,
  "data": { ... },
  "message": "Operation successful"
}
```
