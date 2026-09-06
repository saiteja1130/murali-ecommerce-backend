# Project Brief: Backend API (murali-ecommerce-backend)

## 1. Overview
RESTful API backend for the multi-department e-commerce ecosystem.
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Port**: `5000`

## 2. Key Modules
- **Authentication**: JWT token issuance, password hashing via bcrypt.
- **Product & Catalog Management**: Multi-category hierarchies, variant stock management, image uploads via Multer.
- **Cart & Order Processing**: Synchronized user cart state, order creation, and status tracking.
- **Static Assets**: Express static middleware mounting `/uploads` directory.
