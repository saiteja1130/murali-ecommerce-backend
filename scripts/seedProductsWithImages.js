import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

import MainCategory from '../models/MainCategory.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uploadsDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Download image helper using native Node stream with timeout
const downloadImage = (url, destFilename) => {
  return new Promise((resolve) => {
    const destPath = path.join(uploadsDir, destFilename);
    const localUrl = `/uploads/products/${destFilename}`;

    // If file already exists and is non-empty, reuse it
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve(localUrl);
    }

    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, (response) => {
      // Handle HTTP redirects (301, 302, 307)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        return downloadImage(response.headers.location, destFilename).then(resolve);
      }

      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        console.warn(`[Download Warning] Failed ${url} (status ${response.statusCode}), falling back to remote URL`);
        return resolve(url);
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(localUrl));
      });
    });

    request.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch (e) {}
      console.warn(`[Download Error] ${err.message}, falling back to remote URL`);
      resolve(url);
    });

    request.setTimeout(12000, () => {
      request.destroy();
      file.close();
      try { fs.unlinkSync(destPath); } catch (e) {}
      console.warn(`[Download Timeout] ${url}, falling back to remote URL`);
      resolve(url);
    });
  });
};

// Main Categories data
const mainCategoriesData = [
  {
    name: "Women",
    slug: "women",
    description: "Curated luxury haute couture, jewelry, handbags, footwear and beauty for women.",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800",
    order: 1,
  },
  {
    name: "Kids",
    slug: "kids",
    description: "Playful, comfortable, and trendy fashion, footwear, toys, and essentials for kids.",
    image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800",
    order: 2,
  },
];

// Subcategories mapping
const subcategoriesData = [
  // Women Subcategories
  { key: "JEWELRY_CATEGORY_ID", name: "Jewelry", slug: "jewelry", mainCatSlug: "women", description: "Gold, silver, and pearl fine jewelry", order: 1 },
  { key: "BAGS_CATEGORY_ID", name: "Handbags & Bags", slug: "handbags-bags", mainCatSlug: "women", description: "Tote bags, crossbody bags, and satchels", order: 2 },
  { key: "FOOTWEAR_CATEGORY_ID", name: "Footwear", slug: "footwear", mainCatSlug: "women", description: "Heels, sandals, and casual sneakers", order: 3 },
  { key: "DRESSES_CATEGORY_ID", name: "Dresses", slug: "dresses", mainCatSlug: "women", description: "Floral, evening, and party dresses", order: 4 },
  { key: "TOPS_CATEGORY_ID", name: "Tops & Shirts", slug: "tops-shirts", mainCatSlug: "women", description: "Casual tops, blouses, and shirts", order: 5 },
  { key: "JEANS_CATEGORY_ID", name: "Jeans & Denim", slug: "jeans-denim", mainCatSlug: "women", description: "High-waist, wide-leg, and skinny jeans", order: 6 },
  { key: "HAIR_ACCESSORIES_CATEGORY_ID", name: "Hair Accessories", slug: "hair-accessories", mainCatSlug: "women", description: "Pearl clips, satin scrunchies, and bands", order: 7 },
  { key: "SUNGLASSES_CATEGORY_ID", name: "Sunglasses", slug: "sunglasses", mainCatSlug: "women", description: "Oversized and stylish designer frames", order: 8 },
  { key: "WATCHES_CATEGORY_ID", name: "Watches", slug: "watches", mainCatSlug: "women", description: "Classic and minimal wristwatches", order: 9 },
  { key: "BEAUTY_CATEGORY_ID", name: "Beauty & Cosmetics", slug: "beauty-cosmetics", mainCatSlug: "women", description: "Lipsticks, brush sets, and vanity organizers", order: 10 },
  { key: "WALLETS_CATEGORY_ID", name: "Wallets & Clutches", slug: "wallets-clutches", mainCatSlug: "women", description: "Compact leather wallets and clutches", order: 11 },

  // Kids Subcategories
  { key: "KIDS_DRESSES_CATEGORY_ID", name: "Girls Dresses", slug: "girls-dresses", mainCatSlug: "kids", description: "Party and cotton dresses for girls", order: 1 },
  { key: "KIDS_SHIRTS_CATEGORY_ID", name: "Boys Shirts", slug: "boys-shirts", mainCatSlug: "kids", description: "Checked and casual shirts for boys", order: 2 },
  { key: "KIDS_TSHIRTS_CATEGORY_ID", name: "Kids T-Shirts", slug: "kids-tshirts", mainCatSlug: "kids", description: "Printed and cartoon cotton t-shirts", order: 3 },
  { key: "KIDS_JEANS_CATEGORY_ID", name: "Kids Jeans", slug: "kids-jeans", mainCatSlug: "kids", description: "Comfortable regular fit denim", order: 4 },
  { key: "KIDS_SHORTS_CATEGORY_ID", name: "Kids Shorts", slug: "kids-shorts", mainCatSlug: "kids", description: "Lightweight elastic waist shorts", order: 5 },
  { key: "KIDS_FOOTWEAR_CATEGORY_ID", name: "Kids Footwear", slug: "kids-footwear", mainCatSlug: "kids", description: "Sneakers, party sandals, and play shoes", order: 6 },
  { key: "KIDS_BAGS_CATEGORY_ID", name: "Kids Bags & Backpacks", slug: "kids-bags-backpacks", mainCatSlug: "kids", description: "School backpacks and mini bags", order: 7 },
  { key: "KIDS_ACCESSORIES_CATEGORY_ID", name: "Kids Accessories", slug: "kids-accessories", mainCatSlug: "kids", description: "Baseball caps, digital watches, and clips", order: 8 },
  { key: "TOYS_CATEGORY_ID", name: "Toys & Games", slug: "toys-games", mainCatSlug: "kids", description: "Building blocks and plush teddy bears", order: 9 },
  { key: "KIDS_HOODIES_CATEGORY_ID", name: "Kids Hoodies", slug: "kids-hoodies", mainCatSlug: "kids", description: "Warm cotton fleece hoodies", order: 10 },
  { key: "KIDS_BOTTOMWEAR_CATEGORY_ID", name: "Kids Bottomwear", slug: "kids-bottomwear", mainCatSlug: "kids", description: "Cotton track pants and casual joggers", order: 11 },
];

// Raw Product Datasets
const womenProductsRaw = [
  {
    name: "Gold Plated Hoop Earrings",
    slug: "gold-plated-hoop-earrings",
    sku: "JW-EAR-001",
    categoryKey: "JEWELRY_CATEGORY_ID",
    price: 499,
    originalPrice: 799,
    description: "Elegant gold-plated hoop earrings suitable for everyday wear and special occasions.",
    images: [
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800",
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800"
    ],
    isStockAvailable: true,
    variants: [
      { sku: "JW-EAR-001-GOLD", color: "Gold", colorHex: "#D4AF37", size: "Medium", stock: 25, price: 499 }
    ],
    composition: "Alloy with gold plating",
    sustainability: "Reusable jewelry box packaging",
    careInstructions: "Keep away from water, perfume and chemicals.",
    dimensions: "Diameter: 35mm"
  },
  {
    name: "Pearl Drop Earrings",
    slug: "pearl-drop-earrings",
    sku: "JW-EAR-002",
    categoryKey: "JEWELRY_CATEGORY_ID",
    price: 599,
    originalPrice: 999,
    description: "Classic pearl drop earrings with an elegant design for parties and occasions.",
    images: [
      "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=800",
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800"
    ],
    isStockAvailable: true,
    variants: [
      { sku: "JW-EAR-002-WHITE", color: "White", colorHex: "#FFFFFF", size: "Standard", stock: 18, price: 599 }
    ],
    composition: "Artificial Pearl and Alloy",
    careInstructions: "Store in a dry jewelry box.",
    dimensions: "Length: 45mm"
  },
  {
    name: "Minimal Gold Necklace",
    slug: "minimal-gold-necklace",
    sku: "JW-NCK-001",
    categoryKey: "JEWELRY_CATEGORY_ID",
    price: 699,
    originalPrice: 1199,
    description: "Minimal gold necklace designed for a stylish everyday look.",
    images: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800",
      "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800"
    ],
    isStockAvailable: true,
    variants: [
      { sku: "JW-NCK-001-GOLD", color: "Gold", colorHex: "#D4AF37", size: "16 inch", stock: 20, price: 699 },
      { sku: "JW-NCK-001-SILVER", color: "Silver", colorHex: "#C0C0C0", size: "16 inch", stock: 15, price: 699 }
    ],
    composition: "Stainless steel with gold plating",
    careInstructions: "Avoid contact with water and perfume.",
    dimensions: "Chain length: 16 inch"
  },
  {
    name: "Charm Bracelet",
    slug: "charm-bracelet",
    sku: "JW-BRC-001",
    categoryKey: "JEWELRY_CATEGORY_ID",
    price: 449,
    originalPrice: 699,
    description: "Beautiful charm bracelet with a delicate feminine design.",
    images: ["https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "JW-BRC-001-GOLD", color: "Gold", colorHex: "#D4AF37", size: "Adjustable", stock: 30, price: 449 }
    ],
    composition: "Alloy",
    careInstructions: "Keep dry and clean with a soft cloth."
  },
  {
    name: "Classic Women's Handbag",
    slug: "classic-womens-handbag",
    sku: "BG-HDB-001",
    categoryKey: "BAGS_CATEGORY_ID",
    price: 1299,
    originalPrice: 1999,
    description: "Spacious and stylish handbag suitable for office, shopping and casual outings.",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800",
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800"
    ],
    isStockAvailable: true,
    variants: [
      { sku: "BG-HDB-001-BLACK", color: "Black", colorHex: "#000000", size: "Large", stock: 15, price: 1299 },
      { sku: "BG-HDB-001-BROWN", color: "Brown", colorHex: "#8B4513", size: "Large", stock: 12, price: 1299 }
    ],
    composition: "Premium PU Leather",
    careInstructions: "Wipe with a soft dry cloth.",
    dimensions: "32 x 25 x 12 cm"
  },
  {
    name: "Mini Crossbody Bag",
    slug: "mini-crossbody-bag",
    sku: "BG-CRO-001",
    categoryKey: "BAGS_CATEGORY_ID",
    price: 899,
    originalPrice: 1399,
    description: "Compact crossbody bag perfect for casual outings and evening wear.",
    images: ["https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "BG-CRO-001-BLACK", color: "Black", colorHex: "#000000", size: "Small", stock: 20, price: 899 },
      { sku: "BG-CRO-001-PINK", color: "Pink", colorHex: "#FFC0CB", size: "Small", stock: 14, price: 899 }
    ],
    composition: "PU Leather",
    dimensions: "20 x 14 x 7 cm"
  },
  {
    name: "Women's Tote Bag",
    slug: "womens-tote-bag",
    sku: "BG-TOT-001",
    categoryKey: "BAGS_CATEGORY_ID",
    price: 1099,
    originalPrice: 1699,
    description: "Large everyday tote bag with enough space for personal essentials.",
    images: ["https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "BG-TOT-001-BEIGE", color: "Beige", colorHex: "#F5F5DC", size: "Large", stock: 20, price: 1099 }
    ],
    composition: "Synthetic Leather",
    dimensions: "38 x 30 x 13 cm"
  },
  {
    name: "Women's Casual Sneakers",
    slug: "womens-casual-sneakers",
    sku: "FT-SNK-001",
    categoryKey: "FOOTWEAR_CATEGORY_ID",
    price: 1499,
    originalPrice: 2299,
    description: "Comfortable casual sneakers designed for everyday walking and outings.",
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800"
    ],
    isStockAvailable: true,
    variants: [
      { sku: "FT-SNK-001-WHITE-6", color: "White", colorHex: "#FFFFFF", size: "6", stock: 10, price: 1499 },
      { sku: "FT-SNK-001-WHITE-7", color: "White", colorHex: "#FFFFFF", size: "7", stock: 12, price: 1499 },
      { sku: "FT-SNK-001-WHITE-8", color: "White", colorHex: "#FFFFFF", size: "8", stock: 8, price: 1499 }
    ],
    composition: "Synthetic upper with rubber sole",
    careInstructions: "Clean with a soft damp cloth."
  },
  {
    name: "Women's Block Heel Sandals",
    slug: "womens-block-heel-sandals",
    sku: "FT-SDL-001",
    categoryKey: "FOOTWEAR_CATEGORY_ID",
    price: 1199,
    originalPrice: 1799,
    description: "Stylish block heel sandals suitable for parties and special occasions.",
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "FT-SDL-001-BLACK-6", color: "Black", colorHex: "#000000", size: "6", stock: 10, price: 1199 },
      { sku: "FT-SDL-001-BLACK-7", color: "Black", colorHex: "#000000", size: "7", stock: 8, price: 1199 }
    ],
    composition: "Synthetic material",
    dimensions: "Heel height: 3.5 inch"
  },
  {
    name: "Floral Summer Dress",
    slug: "floral-summer-dress",
    sku: "DRS-FLR-001",
    categoryKey: "DRESSES_CATEGORY_ID",
    price: 999,
    originalPrice: 1599,
    description: "Lightweight floral summer dress with a comfortable relaxed fit.",
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800"
    ],
    isStockAvailable: true,
    variants: [
      { sku: "DRS-FLR-001-PINK-S", color: "Pink", colorHex: "#FFC0CB", size: "S", stock: 8, price: 999 },
      { sku: "DRS-FLR-001-PINK-M", color: "Pink", colorHex: "#FFC0CB", size: "M", stock: 12, price: 999 },
      { sku: "DRS-FLR-001-PINK-L", color: "Pink", colorHex: "#FFC0CB", size: "L", stock: 10, price: 999 }
    ],
    composition: "100% Cotton",
    sustainability: "Made with breathable natural fabric",
    careInstructions: "Machine wash with similar colors."
  },
  {
    name: "Women's Casual Top",
    slug: "womens-casual-top",
    sku: "TOP-CAS-001",
    categoryKey: "TOPS_CATEGORY_ID",
    price: 599,
    originalPrice: 899,
    description: "Comfortable casual top that pairs well with jeans, trousers and skirts.",
    images: ["https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "TOP-CAS-001-WHITE-S", color: "White", colorHex: "#FFFFFF", size: "S", stock: 10, price: 599 },
      { sku: "TOP-CAS-001-WHITE-M", color: "White", colorHex: "#FFFFFF", size: "M", stock: 15, price: 599 }
    ],
    composition: "Cotton Blend",
    careInstructions: "Machine wash cold."
  },
  {
    name: "High Waist Wide Leg Jeans",
    slug: "high-waist-wide-leg-jeans",
    sku: "JNS-WID-001",
    categoryKey: "JEANS_CATEGORY_ID",
    price: 1399,
    originalPrice: 1999,
    description: "Trendy high-waist wide-leg jeans with a comfortable modern fit.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "JNS-WID-001-BLUE-28", color: "Blue", colorHex: "#4169E1", size: "28", stock: 8, price: 1399 },
      { sku: "JNS-WID-001-BLUE-30", color: "Blue", colorHex: "#4169E1", size: "30", stock: 12, price: 1399 },
      { sku: "JNS-WID-001-BLUE-32", color: "Blue", colorHex: "#4169E1", size: "32", stock: 10, price: 1399 }
    ],
    composition: "Denim Cotton Blend",
    careInstructions: "Wash inside out with cold water."
  },
  {
    name: "Pearl Hair Clip Set",
    slug: "pearl-hair-clip-set",
    sku: "HA-CLI-001",
    categoryKey: "HAIR_ACCESSORIES_CATEGORY_ID",
    price: 299,
    originalPrice: 499,
    description: "Set of elegant pearl hair clips for everyday and party styling.",
    images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "HA-CLI-001-WHITE", color: "White", colorHex: "#FFFFFF", size: "Set of 4", stock: 30, price: 299 }
    ],
    composition: "Metal and Artificial Pearl"
  },
  {
    name: "Satin Scrunchies Set",
    slug: "satin-scrunchies-set",
    sku: "HA-SCR-001",
    categoryKey: "HAIR_ACCESSORIES_CATEGORY_ID",
    price: 249,
    originalPrice: 399,
    description: "Soft satin scrunchies designed to reduce hair pulling and breakage.",
    images: ["https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "HA-SCR-001-MULTI", color: "Multicolor", colorHex: "#D8BFD8", size: "Set of 5", stock: 40, price: 249 }
    ],
    composition: "Satin Fabric"
  },
  {
    name: "Oversized Fashion Sunglasses",
    slug: "oversized-fashion-sunglasses",
    sku: "SG-OVR-001",
    categoryKey: "SUNGLASSES_CATEGORY_ID",
    price: 699,
    originalPrice: 999,
    description: "Oversized sunglasses with a stylish frame for everyday fashion.",
    images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "SG-OVR-001-BLACK", color: "Black", colorHex: "#000000", size: "Standard", stock: 25, price: 699 },
      { sku: "SG-OVR-001-BROWN", color: "Brown", colorHex: "#8B4513", size: "Standard", stock: 20, price: 699 }
    ],
    composition: "Polycarbonate Frame",
    dimensions: "Lens width: 55mm"
  },
  {
    name: "Minimal Women's Watch",
    slug: "minimal-womens-watch",
    sku: "WT-MIN-001",
    categoryKey: "WATCHES_CATEGORY_ID",
    price: 899,
    originalPrice: 1499,
    description: "Elegant minimal watch with a slim design suitable for daily wear.",
    images: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "WT-MIN-001-GOLD", color: "Gold", colorHex: "#D4AF37", size: "Small", stock: 15, price: 899 },
      { sku: "WT-MIN-001-SILVER", color: "Silver", colorHex: "#C0C0C0", size: "Small", stock: 15, price: 899 }
    ],
    composition: "Stainless Steel",
    dimensions: "Dial: 32mm"
  },
  {
    name: "Matte Liquid Lipstick",
    slug: "matte-liquid-lipstick",
    sku: "BT-LIP-001",
    categoryKey: "BEAUTY_CATEGORY_ID",
    price: 399,
    originalPrice: 599,
    description: "Long-lasting matte liquid lipstick with a smooth lightweight finish.",
    images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "BT-LIP-001-RED", color: "Ruby Red", colorHex: "#9B111E", size: "5ml", stock: 30, price: 399 },
      { sku: "BT-LIP-001-NUDE", color: "Nude", colorHex: "#A67B5B", size: "5ml", stock: 25, price: 399 },
      { sku: "BT-LIP-001-PINK", color: "Pink", colorHex: "#FF69B4", size: "5ml", stock: 20, price: 399 }
    ],
    composition: "Cosmetic-grade ingredients",
    careInstructions: "Store in a cool and dry place."
  },
  {
    name: "Makeup Brush Set",
    slug: "makeup-brush-set",
    sku: "BT-BRS-001",
    categoryKey: "BEAUTY_CATEGORY_ID",
    price: 799,
    originalPrice: 1199,
    description: "Complete makeup brush set for foundation, blush, eyeshadow and contouring.",
    images: ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "BT-BRS-001-MULTI", color: "Multicolor", colorHex: "#D8BFD8", size: "12 Pieces", stock: 20, price: 799 }
    ],
    composition: "Synthetic Bristles and Wooden Handles",
    careInstructions: "Clean brushes regularly with mild soap."
  },
  {
    name: "Women's Compact Wallet",
    slug: "womens-compact-wallet",
    sku: "WL-CMP-001",
    categoryKey: "WALLETS_CATEGORY_ID",
    price: 499,
    originalPrice: 799,
    description: "Compact wallet with multiple card slots and a secure zipper compartment.",
    images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "WL-CMP-001-PINK", color: "Pink", colorHex: "#FFC0CB", size: "Small", stock: 20, price: 499 },
      { sku: "WL-CMP-001-BLACK", color: "Black", colorHex: "#000000", size: "Small", stock: 25, price: 499 }
    ],
    composition: "PU Leather",
    dimensions: "12 x 9 x 2 cm"
  },
  {
    name: "Vanity Makeup Organizer",
    slug: "vanity-makeup-organizer",
    sku: "BT-ORG-001",
    categoryKey: "BEAUTY_CATEGORY_ID",
    price: 899,
    originalPrice: 1299,
    description: "Transparent makeup organizer with multiple compartments for cosmetics and accessories.",
    images: ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "BT-ORG-001-CLEAR", color: "Clear", colorHex: "#F5F5F5", size: "Large", stock: 15, price: 899 }
    ],
    composition: "Acrylic",
    dimensions: "24 x 16 x 12 cm"
  }
];

const kidsProductsRaw = [
  {
    name: "Girls Floral Party Dress",
    slug: "girls-floral-party-dress",
    sku: "KG-DRS-001",
    categoryKey: "KIDS_DRESSES_CATEGORY_ID",
    price: 899,
    originalPrice: 1299,
    description: "Beautiful floral party dress for girls, perfect for birthdays and special occasions.",
    images: [
      "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800",
      "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800"
    ],
    isStockAvailable: true,
    variants: [
      { sku: "KG-DRS-001-PINK-4Y", color: "Pink", colorHex: "#FFC0CB", size: "4Y", stock: 8, price: 899 },
      { sku: "KG-DRS-001-PINK-6Y", color: "Pink", colorHex: "#FFC0CB", size: "6Y", stock: 10, price: 899 },
      { sku: "KG-DRS-001-PINK-8Y", color: "Pink", colorHex: "#FFC0CB", size: "8Y", stock: 8, price: 899 }
    ],
    composition: "Cotton Blend",
    careInstructions: "Machine wash gently with similar colors."
  },
  {
    name: "Girls Cotton Casual Dress",
    slug: "girls-cotton-casual-dress",
    sku: "KG-DRS-002",
    categoryKey: "KIDS_DRESSES_CATEGORY_ID",
    price: 699,
    originalPrice: 999,
    description: "Soft and comfortable cotton dress for everyday wear.",
    images: ["https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KG-DRS-002-YELLOW-3Y", color: "Yellow", colorHex: "#FFD700", size: "3Y", stock: 10, price: 699 },
      { sku: "KG-DRS-002-YELLOW-5Y", color: "Yellow", colorHex: "#FFD700", size: "5Y", stock: 12, price: 699 },
      { sku: "KG-DRS-002-YELLOW-7Y", color: "Yellow", colorHex: "#FFD700", size: "7Y", stock: 8, price: 699 }
    ],
    composition: "100% Cotton",
    careInstructions: "Machine wash cold."
  },
  {
    name: "Boys Casual Checked Shirt",
    slug: "boys-casual-checked-shirt",
    sku: "KB-SH-001",
    categoryKey: "KIDS_SHIRTS_CATEGORY_ID",
    price: 599,
    originalPrice: 899,
    description: "Comfortable checked shirt for boys, suitable for casual outings and everyday wear.",
    images: ["https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KB-SH-001-BLUE-5Y", color: "Blue", colorHex: "#4169E1", size: "5Y", stock: 10, price: 599 },
      { sku: "KB-SH-001-BLUE-7Y", color: "Blue", colorHex: "#4169E1", size: "7Y", stock: 12, price: 599 },
      { sku: "KB-SH-001-BLUE-9Y", color: "Blue", colorHex: "#4169E1", size: "9Y", stock: 8, price: 599 }
    ],
    composition: "Cotton",
    careInstructions: "Machine wash with similar colors."
  },
  {
    name: "Kids Printed T-Shirt",
    slug: "kids-printed-tshirt",
    sku: "KTS-001",
    categoryKey: "KIDS_TSHIRTS_CATEGORY_ID",
    price: 399,
    originalPrice: 599,
    description: "Fun printed cotton T-shirt designed for comfortable everyday wear.",
    images: ["https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KTS-001-RED-4Y", color: "Red", colorHex: "#FF0000", size: "4Y", stock: 15, price: 399 },
      { sku: "KTS-001-RED-6Y", color: "Red", colorHex: "#FF0000", size: "6Y", stock: 20, price: 399 },
      { sku: "KTS-001-RED-8Y", color: "Red", colorHex: "#FF0000", size: "8Y", stock: 15, price: 399 },
      { sku: "KTS-001-RED-10Y", color: "Red", colorHex: "#FF0000", size: "10Y", stock: 10, price: 399 }
    ],
    composition: "100% Cotton",
    careInstructions: "Machine wash cold."
  },
  {
    name: "Kids Cartoon T-Shirt",
    slug: "kids-cartoon-tshirt",
    sku: "KTS-002",
    categoryKey: "KIDS_TSHIRTS_CATEGORY_ID",
    price: 449,
    originalPrice: 699,
    description: "Colorful cartoon printed T-shirt made from soft breathable cotton.",
    images: ["https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KTS-002-BLUE-4Y", color: "Blue", colorHex: "#4169E1", size: "4Y", stock: 15, price: 449 },
      { sku: "KTS-002-BLUE-6Y", color: "Blue", colorHex: "#4169E1", size: "6Y", stock: 18, price: 449 },
      { sku: "KTS-002-BLUE-8Y", color: "Blue", colorHex: "#4169E1", size: "8Y", stock: 12, price: 449 }
    ],
    composition: "Cotton",
    careInstructions: "Wash inside out."
  },
  {
    name: "Boys Regular Fit Jeans",
    slug: "boys-regular-fit-jeans",
    sku: "KB-JNS-001",
    categoryKey: "KIDS_JEANS_CATEGORY_ID",
    price: 799,
    originalPrice: 1199,
    description: "Comfortable regular-fit jeans designed for active kids.",
    images: ["https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KB-JNS-001-BLUE-5Y", color: "Blue", colorHex: "#4169E1", size: "5Y", stock: 10, price: 799 },
      { sku: "KB-JNS-001-BLUE-7Y", color: "Blue", colorHex: "#4169E1", size: "7Y", stock: 12, price: 799 },
      { sku: "KB-JNS-001-BLUE-9Y", color: "Blue", colorHex: "#4169E1", size: "9Y", stock: 10, price: 799 }
    ],
    composition: "Cotton Denim",
    careInstructions: "Wash inside out with cold water."
  },
  {
    name: "Kids Cotton Shorts",
    slug: "kids-cotton-shorts",
    sku: "KSH-001",
    categoryKey: "KIDS_SHORTS_CATEGORY_ID",
    price: 399,
    originalPrice: 599,
    description: "Lightweight cotton shorts with an elastic waistband for easy movement.",
    images: ["https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KSH-001-GREEN-4Y", color: "Green", colorHex: "#228B22", size: "4Y", stock: 15, price: 399 },
      { sku: "KSH-001-GREEN-6Y", color: "Green", colorHex: "#228B22", size: "6Y", stock: 15, price: 399 },
      { sku: "KSH-001-GREEN-8Y", color: "Green", colorHex: "#228B22", size: "8Y", stock: 12, price: 399 }
    ],
    composition: "100% Cotton",
    careInstructions: "Machine wash cold."
  },
  {
    name: "Kids Casual Sneakers",
    slug: "kids-casual-sneakers",
    sku: "KFT-001",
    categoryKey: "KIDS_FOOTWEAR_CATEGORY_ID",
    price: 899,
    originalPrice: 1299,
    description: "Comfortable lightweight sneakers designed for school, play and everyday activities.",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KFT-001-WHITE-10", color: "White", colorHex: "#FFFFFF", size: "10", stock: 8, price: 899 },
      { sku: "KFT-001-WHITE-11", color: "White", colorHex: "#FFFFFF", size: "11", stock: 10, price: 899 },
      { sku: "KFT-001-WHITE-12", color: "White", colorHex: "#FFFFFF", size: "12", stock: 12, price: 899 },
      { sku: "KFT-001-WHITE-13", color: "White", colorHex: "#FFFFFF", size: "13", stock: 8, price: 899 }
    ],
    composition: "Mesh Upper with Rubber Sole",
    careInstructions: "Clean with a damp cloth."
  },
  {
    name: "Girls Party Sandals",
    slug: "girls-party-sandals",
    sku: "KFT-002",
    categoryKey: "KIDS_FOOTWEAR_CATEGORY_ID",
    price: 699,
    originalPrice: 999,
    description: "Cute and comfortable party sandals for girls.",
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KFT-002-PINK-10", color: "Pink", colorHex: "#FFC0CB", size: "10", stock: 10, price: 699 },
      { sku: "KFT-002-PINK-11", color: "Pink", colorHex: "#FFC0CB", size: "11", stock: 12, price: 699 },
      { sku: "KFT-002-PINK-12", color: "Pink", colorHex: "#FFC0CB", size: "12", stock: 10, price: 699 }
    ],
    composition: "Synthetic Material"
  },
  {
    name: "Kids School Backpack",
    slug: "kids-school-backpack",
    sku: "KBG-001",
    categoryKey: "KIDS_BAGS_CATEGORY_ID",
    price: 799,
    originalPrice: 1199,
    description: "Lightweight school backpack with spacious compartments for books and essentials.",
    images: ["https://images.unsplash.com/photo-1588072432836-e10032774350?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KBG-001-BLUE", color: "Blue", colorHex: "#4169E1", size: "Medium", stock: 20, price: 799 },
      { sku: "KBG-001-PINK", color: "Pink", colorHex: "#FFC0CB", size: "Medium", stock: 20, price: 799 }
    ],
    composition: "Polyester",
    dimensions: "38 x 28 x 14 cm"
  },
  {
    name: "Kids Cotton Baseball Cap",
    slug: "kids-cotton-baseball-cap",
    sku: "KCP-001",
    categoryKey: "KIDS_ACCESSORIES_CATEGORY_ID",
    price: 249,
    originalPrice: 399,
    description: "Comfortable cotton baseball cap with an adjustable strap.",
    images: ["https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KCP-001-BLUE", color: "Blue", colorHex: "#4169E1", size: "Adjustable", stock: 25, price: 249 },
      { sku: "KCP-001-PINK", color: "Pink", colorHex: "#FFC0CB", size: "Adjustable", stock: 25, price: 249 }
    ],
    composition: "100% Cotton"
  },
  {
    name: "Kids Digital Watch",
    slug: "kids-digital-watch",
    sku: "KWT-001",
    categoryKey: "KIDS_ACCESSORIES_CATEGORY_ID",
    price: 499,
    originalPrice: 799,
    description: "Fun and colorful digital watch designed for kids.",
    images: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KWT-001-BLUE", color: "Blue", colorHex: "#4169E1", size: "Kids", stock: 20, price: 499 },
      { sku: "KWT-001-PINK", color: "Pink", colorHex: "#FFC0CB", size: "Kids", stock: 20, price: 499 }
    ],
    composition: "Silicone Strap and Plastic Case"
  },
  {
    name: "Building Blocks Set",
    slug: "building-blocks-set",
    sku: "KTY-001",
    categoryKey: "TOYS_CATEGORY_ID",
    price: 699,
    originalPrice: 999,
    description: "Colorful building blocks set designed to encourage creativity and imaginative play.",
    images: ["https://images.unsplash.com/photo-1594784054745-0c8f9f0b4d0d?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KTY-001-MULTI", color: "Multicolor", colorHex: "#FFCC00", size: "100 Pieces", stock: 20, price: 699 }
    ],
    composition: "Non-toxic ABS Plastic",
    careInstructions: "Clean with a damp cloth."
  },
  {
    name: "Kids Teddy Bear",
    slug: "kids-teddy-bear",
    sku: "KTY-002",
    categoryKey: "TOYS_CATEGORY_ID",
    price: 599,
    originalPrice: 899,
    description: "Soft cuddly teddy bear suitable for kids and gifting.",
    images: ["https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KTY-002-BROWN", color: "Brown", colorHex: "#8B4513", size: "Medium", stock: 25, price: 599 }
    ],
    composition: "Soft Plush Fabric",
    dimensions: "35 cm"
  },
  {
    name: "Girls Hair Accessories Set",
    slug: "girls-hair-accessories-set",
    sku: "KHA-001",
    categoryKey: "KIDS_ACCESSORIES_CATEGORY_ID",
    price: 299,
    originalPrice: 499,
    description: "Colorful hair clips and accessories set for girls.",
    images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KHA-001-MULTI", color: "Multicolor", colorHex: "#FFB6C1", size: "Set of 10", stock: 30, price: 299 }
    ],
    composition: "Plastic and Fabric"
  },
  {
    name: "Kids Printed Hoodie",
    slug: "kids-printed-hoodie",
    sku: "KHD-001",
    categoryKey: "KIDS_HOODIES_CATEGORY_ID",
    price: 799,
    originalPrice: 1199,
    description: "Warm and comfortable printed hoodie for kids.",
    images: ["https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KHD-001-GREY-6Y", color: "Grey", colorHex: "#808080", size: "6Y", stock: 10, price: 799 },
      { sku: "KHD-001-GREY-8Y", color: "Grey", colorHex: "#808080", size: "8Y", stock: 12, price: 799 },
      { sku: "KHD-001-GREY-10Y", color: "Grey", colorHex: "#808080", size: "10Y", stock: 10, price: 799 }
    ],
    composition: "Cotton Fleece",
    careInstructions: "Machine wash cold."
  },
  {
    name: "Kids Cotton Track Pants",
    slug: "kids-cotton-track-pants",
    sku: "KTP-001",
    categoryKey: "KIDS_BOTTOMWEAR_CATEGORY_ID",
    price: 499,
    originalPrice: 799,
    description: "Comfortable cotton track pants suitable for play, sports and casual wear.",
    images: ["https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800"],
    isStockAvailable: true,
    variants: [
      { sku: "KTP-001-BLACK-6Y", color: "Black", colorHex: "#000000", size: "6Y", stock: 12, price: 499 },
      { sku: "KTP-001-BLACK-8Y", color: "Black", colorHex: "#000000", size: "8Y", stock: 15, price: 499 },
      { sku: "KTP-001-BLACK-10Y", color: "Black", colorHex: "#000000", size: "10Y", stock: 12, price: 499 }
    ],
    composition: "Cotton Blend",
    careInstructions: "Machine wash cold."
  }
];

const runSeeder = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGO_URI_DEV || 'mongodb://127.0.0.1:27017/ecommerce';
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  console.log('\n--- 1. SEEDING MAIN CATEGORIES ---');
  const mainCatMap = {};
  for (const mData of mainCategoriesData) {
    let mainCat = await MainCategory.findOne({ slug: mData.slug });
    if (!mainCat) {
      mainCat = await MainCategory.create(mData);
      console.log(`Created Main Category: ${mainCat.name} (${mainCat.slug})`);
    } else {
      console.log(`Found Main Category: ${mainCat.name} (${mainCat.slug})`);
    }
    mainCatMap[mData.slug] = mainCat._id;
  }

  console.log('\n--- 2. SEEDING SUBCATEGORIES ---');
  const subCatKeyToIdMap = {};
  for (const sData of subcategoriesData) {
    const parentMainCatId = mainCatMap[sData.mainCatSlug];
    let subCat = await Category.findOne({ slug: sData.slug });
    if (!subCat) {
      subCat = await Category.create({
        name: sData.name,
        slug: sData.slug,
        mainCategory: parentMainCatId,
        description: sData.description,
        order: sData.order,
        isFeatured: true,
      });
      console.log(`Created Subcategory: ${subCat.name} -> Main: ${sData.mainCatSlug}`);
    } else {
      subCat.mainCategory = parentMainCatId;
      await subCat.save();
      console.log(`Updated Subcategory: ${subCat.name} -> Main: ${sData.mainCatSlug}`);
    }
    subCatKeyToIdMap[sData.key] = subCat._id;
  }

  console.log('\n--- 3. DOWNLOADING IMAGES & SEEDING PRODUCTS ---');
  const allProductsToSeed = [
    ...womenProductsRaw.map((p) => ({ ...p, mainCategorySlug: 'women' })),
    ...kidsProductsRaw.map((p) => ({ ...p, mainCategorySlug: 'kids' })),
  ];

  let insertedCount = 0;
  for (const p of allProductsToSeed) {
    const localImagePaths = [];
    for (let idx = 0; idx < (p.images || []).length; idx++) {
      const imgUrl = p.images[idx];
      const filename = `${p.slug}-${idx + 1}.jpg`;
      const localPath = await downloadImage(imgUrl, filename);
      localImagePaths.push(localPath);
    }

    const catId = subCatKeyToIdMap[p.categoryKey];
    const mainCatId = mainCatMap[p.mainCategorySlug];

    const productPayload = {
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: catId,
      mainCategory: mainCatId,
      price: p.price,
      originalPrice: p.originalPrice || null,
      description: p.description || '',
      images: localImagePaths,
      isStockAvailable: p.isStockAvailable !== false,
      variants: p.variants || [],
      composition: p.composition || '',
      sustainability: p.sustainability || '',
      careInstructions: p.careInstructions || '',
      dimensions: p.dimensions || '',
      isDeleted: false,
    };

    await Product.findOneAndUpdate(
      { slug: p.slug },
      { $set: productPayload },
      { upsert: true, new: true, runValidators: true }
    );
    insertedCount++;
    console.log(`[${insertedCount}/${allProductsToSeed.length}] Seeded Product: ${p.name} (${p.mainCategorySlug})`);
  }

  console.log('\n======================================================');
  console.log(`  Seeding Complete!`);
  console.log(`  Main Categories : ${Object.keys(mainCatMap).length}`);
  console.log(`  Subcategories   : ${Object.keys(subCatKeyToIdMap).length}`);
  console.log(`  Products Seeded : ${insertedCount}`);
  console.log(`  Local Images at : ${uploadsDir}`);
  console.log('======================================================\n');

  await mongoose.disconnect();
};

runSeeder().catch((err) => {
  console.error('Seeder execution error:', err);
  process.exit(1);
});
