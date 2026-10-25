import { evaluateCouponForItems } from '../controllers/couponController.js';

const runTests = async () => {
  console.log('--- STARTING COUPON EVALUATION UNIT TESTS ---\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, name) => {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  };

  // Mock Sarees Category ID and Saree Product
  const sareeCatId = '654321654321654321654321';
  const bagsCatId = '123456123456123456123456';

  const sareeCoupon = {
    code: 'SAREE20',
    discountType: 'percentage',
    discountValue: 20,
    isActive: true,
    isAllCategories: false,
    applicableCategories: [{ _id: sareeCatId, name: 'Sarees', slug: 'sarees' }],
    applicableCategorySlugs: ['sarees'],
    minSpend: 0,
    maxDiscount: null,
  };

  const sareeItem = {
    id: 'item-1',
    price: 3000,
    quantity: 1,
    product: {
      _id: 'prod-saree-1',
      name: 'Kanjeevaram Silk Saree',
      price: 3000,
      category: { _id: sareeCatId, name: 'Sarees', slug: 'sarees' },
    },
  };

  const handbagItem = {
    id: 'item-2',
    price: 2000,
    quantity: 1,
    product: {
      _id: 'prod-bag-1',
      name: 'Italian Leather Handbag',
      price: 2000,
      category: { _id: bagsCatId, name: 'Handbags', slug: 'handbags' },
    },
  };

  // TEST 1: Cart with only non-qualifying items (Handbag only)
  console.log('[Test 1] Bag contains Handbag only:');
  const res1 = await evaluateCouponForItems({
    coupon: sareeCoupon,
    items: [handbagItem],
    cartSubtotal: 2000,
  });
  assert(res1.valid === false, 'Rejects coupon when 0 qualifying category items in bag');
  assert(res1.message.includes('only applicable on Sarees'), 'Error message clearly specifies category restriction');
  console.log('Result 1 message:', res1.message, '\n');

  // TEST 2: Cart with 1 Saree (₹3,000) and 1 Handbag (₹2,000)
  console.log('[Test 2] Bag contains Saree (₹3,000) + Handbag (₹2,000):');
  const res2 = await evaluateCouponForItems({
    coupon: sareeCoupon,
    items: [sareeItem, handbagItem],
    cartSubtotal: 5000,
  });
  assert(res2.valid === true, 'Accepts coupon when Saree is present in bag');
  assert(res2.discountAmount === 600, `Discount is strictly 20% of Saree (₹600), received ₹${res2.discountAmount}`);
  assert(Math.abs(res2.discountRate - 0.12) < 0.001, `Effective rate for client is 12% (600/5000), received ${res2.discountRate}`);
  assert(res2.message.includes('₹600 discount applied'), 'Success message displays exact rupee savings');
  console.log('Result 2 message:', res2.message, '\n');

  // TEST 3: Minimum spend on category
  console.log('[Test 3] Coupon requires min spend of ₹5,000 on Sarees, but Saree is ₹3,000:');
  const sareeCouponWithMinSpend = {
    ...sareeCoupon,
    minSpend: 5000,
  };
  const res3 = await evaluateCouponForItems({
    coupon: sareeCouponWithMinSpend,
    items: [sareeItem, handbagItem], // Saree = ₹3000, Cart = ₹5000
    cartSubtotal: 5000,
  });
  assert(res3.valid === false, 'Rejects coupon when qualifying category subtotal is below min spend');
  assert(res3.message.includes('Minimum purchase of ₹5,000 on qualifying items'), 'Message mentions qualifying items min spend');
  console.log('Result 3 message:', res3.message, '\n');

  // TEST 4: Global storewide coupon
  console.log('[Test 4] Storewide coupon (All Categories):');
  const globalCoupon = {
    code: 'GLOBAL15',
    discountType: 'percentage',
    discountValue: 15,
    isActive: true,
    isAllCategories: true,
    applicableCategories: [],
    applicableCategorySlugs: [],
    minSpend: 0,
  };
  const res4 = await evaluateCouponForItems({
    coupon: globalCoupon,
    items: [sareeItem, handbagItem],
    cartSubtotal: 5000,
  });
  assert(res4.valid === true, 'Accepts global coupon');
  assert(res4.discountAmount === 750, `Discount is 15% of total bag (₹750), received ₹${res4.discountAmount}`);
  console.log('Result 4 message:', res4.message, '\n');

  console.log(`--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
};

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
