# End-to-End System Architecture & Application Manual

> **System Name**: SUMILUX Contemporary & Luxury E-Commerce Ecosystem  
> **Repository Architecture**: Multi-Repository (Storefront, REST Backend, Merchant Admin)  
> **Primary Currency**: Indian Rupee (`₹` - Inclusive of all taxes)  
> **Last Updated**: 2026-08-30

---

## Table of Contents
1. [Executive Summary & Business Purpose](#1-executive-summary--business-purpose)
2. [Ecosystem Architecture & Port Mapping](#2-ecosystem-architecture--port-mapping)
3. [End-to-End Customer Workflows](#3-end-to-end-customer-workflows)
4. [End-to-End Merchant / Admin Workflows](#4-end-to-end-merchant--admin-workflows)
5. [Data Models & Schema Specifications](#5-data-models--schema-specifications)
6. [Core Technical Patterns & Resilience Standards](#6-core-technical-patterns--resilience-standards)
7. [Environment & Local Development Guide](#7-environment--local-development-guide)
8. [Developer & AI Agent Maintenance Protocol](#8-developer--ai-agent-maintenance-protocol)

---

## 1. Executive Summary & Business Purpose

### What is SUMILUX?
SUMILUX is a full-stack, enterprise-grade contemporary luxury and apparel e-commerce platform designed for multi-department retail (e.g., Women's Fashion, Kids, Accessories). 

### Business Goals & Value Proposition
- **High-End Editorial Aesthetics**: Tailored color palette (Obsidian `#1D241C`, Warm Gold `#C69E58`, Botanical Sage `#506040`, Ivory `#FAF8F5`) with Playfair Display serif headings and Plus Jakarta Sans body typography.
- **Zero Friction Commerce**: Instant 1-click Quick Add, optimistic UI toast notifications, guest shopping with automatic cloud-cart sync upon authentication, and streamlined multi-step checkout.
- **Unified Merchant Control**: Real-time administrative dashboard for catalog creation, department/category taxonomy, variant-level stock management, and order fulfillment.

---

## 2. Ecosystem Architecture & Port Mapping

The platform operates across three dedicated repositories:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SUMILUX SYSTEM TOPOLOGY                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │ Customer Frontend │     │  REST API Backend │     │  Merchant Admin   │
  │ (Port 3000)       │────▶│  (Port 5000)      │◀────│  (Port 5173)      │
  │ React 19 + Vite   │     │  Express + Node   │     │  React + Vite     │
  └───────────────────┘     └─────────┬─────────┘     └───────────────────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │ MongoDB Database  │
                            │ & Static /uploads │
                            └───────────────────┘
```

### Service Map
| Service | Directory | Tech Stack | Port | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Storefront** | `murali-ecommerce-frontend` | React 19, Vite, TailwindCSS v4, Lucide Icons | `3000` | Customer browsing, PDP, cart, wishlist, checkout, account. |
| **REST Backend API** | `murali-ecommerce-backend` | Node.js, Express.js, MongoDB/Mongoose, JWT, Multer | `5000` | Data persistence, authentication, catalog endpoints, static media host (`/uploads`). |
| **Merchant Admin** | `murali-ecommerce-admin` | React, Vite, TailwindCSS | `5173` | Catalog CRUD, multi-image upload, department management, order status. |

---

## 3. End-to-End Customer Workflows

```
Customer Entry (/) ──▶ Catalog & Filters (/products) ──▶ Product Details (/product/:id)
                               │                                │
                               ▼                                ▼
                        Quick Add (Toast) ─────────────▶ Add to Cart / Buy Now
                                                                │
                                                                ▼
                     Order Success ◀─── Checkout Flow ◀─── Cart Drawer / (/cart)
```

### 1. Discovery & Catalog Filtering
- **Home Hero Carousel**: Promotes seasonal drops and featured categories with direct deep links.
- **Department Switcher**: Seamless switching between departments (All, Women, Kids) with live item counts.
- **Dynamic Category Pills**: Filter by subcategory with instantaneous URL query parameter sync (`?category=...`).
- **Interactive Dual-Thumb Slider**: Filters items between `₹0` and dynamic catalog max price (`₹10,000+`) with quick price presets.
- **Global Search Modal (⌘K / Ctrl+K)**: Instant multi-field search (Name, Category, Description, Tags, SKU) with trending suggestions.

### 2. Product Detail Page (`/product/:id`)
- **Direct Load & Reload Resilience**: Automatically fetches from `GET /api/products/:id` if not in local state, displaying an elegant loading skeleton to eliminate visual flickering.
- **Multi-Angle Gallery**: Primary image stage with zoom effect and thumbnail navigation.
- **Variant Selector**: Visual color swatches and size buttons with live selection state.
- **Quantity Stepper**: Stepper with out-of-stock disablement.
- **Accordion Tabs**: Product details, fabric composition, wash care instructions, and shipping/return policies.

### 3. Quick Add & Cart Management
- **Instant Quick Add**: 1-click addition from any product card.
- **Optimistic UI Toast**: Instant bottom-right visual toast (`z-[99999]`) showing product thumbnail, quantity, size, and color.
- **Dual-Cart Persistence**:
  - **Guest Mode**: Cart is saved immediately to `localStorage` under `sumilux_cart`.
  - **Authenticated Mode**: Cart state automatically syncs to backend MongoDB (`/api/cart/add`).

### 4. Checkout & Order Placement (`/checkout`)
- **Address Management**: Selection from saved addresses or creation of new delivery address.
- **Pricing Breakdown**: Subtotal, promo code discount calculation, free delivery thresholds (₹5,000+), and tax compliance.
- **Payment Methods**: Cash on Delivery, UPI, Cards, Net Banking.
- **Confirmation**: Dispatches order to backend `/api/orders`, clears active cart, and displays order receipt with tracking ID.

---

## 4. End-to-End Merchant / Admin Workflows

```
Admin Login ──▶ Dashboard Metrics ──▶ Catalog Management ──▶ Order Processing
                                             │
                                             ▼
                                  Product & Media Uploads
```

### 1. Catalog Management (`/products`)
- **Create Product**: Enter title, SKU, price, originalPrice, department, subcategory, sizes, colors, and stock count.
- **Multi-Image Upload**: Uploads primary and secondary hover images via multipart form data (`/api/upload`), storing physical files in backend `/uploads` directory.
- **Quick Stock Toggle**: Instant 1-click toggle between In Stock and Out of Stock.

### 2. Taxonomy & Category Management (`/categories`)
- **Department (Main Category) Creation**: Create top-level departments with banner images and description.
- **Subcategory Nesting**: Associate subcategories to parent departments with automated slug generation.

### 3. Order Fulfillment (`/orders`)
- Real-time order review, customer shipping address verification, and delivery state transitions (Pending -> Processing -> Shipped -> Delivered -> Cancelled).

---

## 5. Data Models & Schema Specifications

### Product Schema (`murali-ecommerce-backend/models/Product.js`)
```javascript
{
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: { type: String, required: true },
  categorySlug: { type: String },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  mainCategory: { type: String },
  mainCategorySlug: { type: String },
  mainCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategory' },
  colors: [{ name: String, hex: String }],
  sizes: [String],
  image: { type: String, required: true },
  hoverImage: { type: String },
  galleryImages: [String],
  badge: { type: String, enum: ['NEW', 'SALE', 'BESTSELLER', 'LIMITED', 'ORGANIC'] },
  totalStock: { type: Number, default: 10 },
  isStockAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false }
}
```

### User & Cart Schemas
- **User**: Name, email, password (bcrypt hash), saved addresses `[{ street, city, state, postalCode, isDefault }]`.
- **Cart**: User reference, `items: [{ product: ObjectId, quantity: Number, selectedSize: String, selectedColor: { name, hex } }]`.
- **Order**: User reference, items snapshot, shippingAddress, subtotal, discount, totalAmount, paymentMethod, paymentStatus, orderStatus.

---

## 6. Core Technical Patterns & Resilience Standards

### A. Image Resolution Adapter Pattern
- **Problem**: Static uploads reside on port `5000` under `/uploads/...`, while frontend runs on port `3000`.
- **Standard**: All image rendering MUST use `resolveImageUrl(imgPath)`:
  ```javascript
  // src/utils/productAdapter.js
  export const resolveImageUrl = (img) => {
    if (!img) return FALLBACK_PRODUCT_IMAGE;
    if (typeof img === 'object') img = img.url || img.src || img.image || '';
    if (typeof img !== 'string' || !img.trim()) return FALLBACK_PRODUCT_IMAGE;
    img = img.trim();
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    if (img.startsWith('/uploads')) return `http://localhost:5000${img}`;
    if (img.startsWith('uploads/')) return `http://localhost:5000/${img}`;
    if (img.startsWith('/assets') || img.startsWith('assets/')) return img.startsWith('/') ? img : `/${img}`;
    return `http://localhost:5000/${img}`;
  };
  ```
- **Loop-Safe Error Handling**:
  ```javascript
  onError={(e) => {
    if (e.currentTarget.src !== FALLBACK_PRODUCT_IMAGE) {
      e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
    }
  }}
  ```

### B. Optimistic Toast Notification Standard
- `showToast` is dispatched synchronously and immediately with zero delay upon clicking Quick Add.
- Rendered in a fixed top-priority container at `z-[99999]`.
- Message format: `${qty}× ${product.name || 'Item'} (${size} / ${colorName})`.

### C. Currency & Tax Notation Standard
- Currency symbol: `₹` (Indian Rupee).
- All customer and admin views must display prices inclusive of all taxes.

---

## 7. Environment & Local Development Guide

### Prerequisites
- Node.js >= 18.x
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or MongoDB Atlas connection URI).

### Starting the Applications
Open three separate terminal windows:

```bash
# 1. Start Backend Server (Port 5000)
cd murali-ecommerce-backend
npm install
npm run dev

# 2. Start Customer Frontend (Port 3000)
cd murali-ecommerce-frontend
npm install
npm run dev

# 3. Start Merchant Admin (Port 5173)
cd murali-ecommerce-admin
npm install
npm run dev
```

---

## 8. Developer & AI Agent Maintenance Protocol

### Mandatory Non-Regression Rule
When implementing future enhancements, new features, or fixing defects:
1. **Never alter existing endpoint contracts** without backward compatibility.
2. **Never hardcode static media paths** without `resolveImageUrl`.
3. **Never delay or block toast notifications** behind network promises.
4. **Never introduce foreign currency symbols** (`$`) into pricing components.
5. **Always update this manual** whenever adding new routes, context providers, or database schemas.
