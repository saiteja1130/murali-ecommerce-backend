# Product Context (murali-ecommerce-backend)

## 1. Domain Entities
- **User**: Authentication credentials, personal profile, saved shipping addresses, and role (customer/admin).
- **MainCategory**: Top-level departments (e.g. Women, Kids) with metadata and banner image.
- **Category**: Subcategories belonging to main categories with slug indexing.
- **Product**: Title, slug, description, price, originalPrice, stock availability, colors, sizes, gallery images, and tags.
- **Cart**: User-associated cart item lines with product reference, quantity, selected size, and color.
- **Order**: Customer info, shipping address, order items snapshot, payment status, and order status.
