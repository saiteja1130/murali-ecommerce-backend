import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';

/**
 * @desc    Get aggregated Admin Dashboard metrics & time-series data
 * @route   GET /api/analytics/dashboard
 * @access  Private/Admin
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const now = new Date();

    // 1. Fetch all non-deleted products
    const allProducts = await Product.find({ isDeleted: { $ne: true } })
      .populate('category', 'name slug')
      .lean();

    // 2. Fetch all orders
    const allOrders = await Order.find()
      .populate('user', 'name email phone addresses')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Fetch all customers (users)
    const allUsers = await User.find({ role: { $ne: 'admin' } })
      .sort({ createdAt: -1 })
      .lean();

    // 4. Fetch all categories
    const allCategories = await Category.find().lean();
    const categoryMap = {};
    allCategories.forEach((cat) => {
      categoryMap[cat._id.toString()] = cat.name;
    });

    // --- KPI Calculations ---
    const paidOrders = allOrders.filter(
      (o) =>
        o.orderStatus !== 'cancelled' &&
        (o.paymentStatus === 'paid' ||
          o.paymentStatus === 'cod_pending' ||
          o.orderStatus === 'delivered' ||
          o.orderStatus === 'confirmed' ||
          o.orderStatus === 'processing' ||
          o.orderStatus === 'shipped')
    );

    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOrdersCount = allOrders.length;
    const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
    const totalCustomersCount = allUsers.length;

    // Low stock calculation
    const lowStockProducts = allProducts.filter((p) => {
      if (p.isStockAvailable === false) return true;
      if (p.variants && p.variants.length > 0) {
        const totalVariantStock = p.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        return totalVariantStock <= 4;
      }
      return false;
    });

    // --- Period-over-Period Growth Calculations (Last 30 days vs Prior 30 days) ---
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentPeriodOrders = paidOrders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
    const priorPeriodOrders = paidOrders.filter(
      (o) => new Date(o.createdAt) >= sixtyDaysAgo && new Date(o.createdAt) < thirtyDaysAgo
    );

    const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const priorRevenue = priorPeriodOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const calcGrowth = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const revenueGrowth = calcGrowth(currentRevenue, priorRevenue);
    const ordersGrowth = calcGrowth(currentPeriodOrders.length, priorPeriodOrders.length);
    const currentAov = currentPeriodOrders.length > 0 ? Math.round(currentRevenue / currentPeriodOrders.length) : 0;
    const priorAov = priorPeriodOrders.length > 0 ? Math.round(priorRevenue / priorPeriodOrders.length) : 0;
    const aovGrowth = calcGrowth(currentAov, priorAov);

    // --- Chart Data Generations ---
    const formatDateKey = (d) => d.toISOString().split('T')[0];

    // 1) 7 Days Chart Data
    const chart7d = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayOrders = paidOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= d && orderDate < nextDay;
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      chart7d.push({
        name: `${dayNames[d.getDay()]} ${d.getDate()}`,
        date: formatDateKey(d),
        revenue: Math.round(dayRevenue),
        orders: dayOrders.length,
      });
    }

    // 2) 30 Days Chart Data (Grouped in 2-day intervals)
    const chart30d = [];
    for (let i = 28; i >= 0; i -= 2) {
      const dEnd = new Date(now);
      dEnd.setDate(dEnd.getDate() - Math.max(0, i - 1));
      dEnd.setHours(23, 59, 59, 999);

      const dStart = new Date(now);
      dStart.setDate(dStart.getDate() - i);
      dStart.setHours(0, 0, 0, 0);

      const slotOrders = paidOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= dStart && orderDate <= dEnd;
      });

      const slotRevenue = slotOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const label = `${dStart.getDate()} ${dStart.toLocaleString('default', { month: 'short' })}`;

      chart30d.push({
        name: label,
        date: formatDateKey(dStart),
        revenue: Math.round(slotRevenue),
        orders: slotOrders.length,
      });
    }

    // 3) 90 Days Chart Data (3 Monthly Buckets)
    const chart90d = [];
    for (let m = 2; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);

      const monthOrders = paidOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= d && orderDate < nextMonth;
      });

      const monthRevenue = monthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      chart90d.push({
        name: d.toLocaleString('default', { month: 'short' }),
        revenue: Math.round(monthRevenue),
        orders: monthOrders.length,
      });
    }

    // 4) YTD Chart Data (Monthly from Jan to current month)
    const chartYTD = [];
    const currentMonth = now.getMonth();
    for (let m = 0; m <= currentMonth; m++) {
      const d = new Date(now.getFullYear(), m, 1);
      const nextMonth = new Date(now.getFullYear(), m + 1, 1);

      const monthOrders = paidOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= d && orderDate < nextMonth;
      });

      const monthRevenue = monthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      chartYTD.push({
        name: d.toLocaleString('default', { month: 'short' }),
        revenue: Math.round(monthRevenue),
        orders: monthOrders.length,
      });
    }

    // --- Category Breakdown ---
    const categorySales = {};
    const categoryColors = ['#C69E58', '#506040', '#1D241C', '#A68758', '#8B9467', '#D4AF37', '#736B5E'];

    let totalItemsSold = 0;
    paidOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const prod = allProducts.find((p) => p._id.toString() === (item.product?._id || item.product?.toString() || item.product));
        const catName = prod?.category?.name || 'Unassigned';
        const itemRevenue = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        const itemQty = Number(item.quantity) || 1;

        if (!categorySales[catName]) {
          categorySales[catName] = { name: catName, revenue: 0, count: 0 };
        }
        categorySales[catName].revenue += itemRevenue;
        categorySales[catName].count += itemQty;
        totalItemsSold += itemQty;
      });
    });

    let categoryData = [];
    if (totalItemsSold > 0) {
      categoryData = Object.values(categorySales).map((cat, idx) => ({
        name: cat.name,
        revenue: cat.revenue,
        count: cat.count,
        value: totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 100) : 0,
        color: categoryColors[idx % categoryColors.length],
      }));
    } else {
      // Fallback to active catalog distribution
      const catCount = {};
      allProducts.forEach((p) => {
        const catName = p.category?.name || 'Unassigned';
        catCount[catName] = (catCount[catName] || 0) + 1;
      });

      const totalProds = allProducts.length || 1;
      categoryData = Object.entries(catCount).map(([name, count], idx) => ({
        name,
        revenue: 0,
        count,
        value: Math.round((count / totalProds) * 100),
        color: categoryColors[idx % categoryColors.length],
      }));
    }

    categoryData.sort((a, b) => b.value - a.value);
    const topCategory = categoryData[0] || { name: 'None', value: 0 };

    // --- Top Selling Products ---
    const productSalesMap = {};
    paidOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const pId = item.product?._id || item.product?.toString() || item.product;
        if (!pId) return;
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { salesCount: 0, totalRevenue: 0 };
        }
        productSalesMap[pId].salesCount += Number(item.quantity) || 1;
        productSalesMap[pId].totalRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      });
    });

    const topSellingProducts = allProducts
      .map((p) => {
        const stats = productSalesMap[p._id.toString()] || { salesCount: 0, totalRevenue: 0 };
        const totalStock = (p.variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        return {
          id: p._id,
          _id: p._id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          categoryName: p.category?.name || 'Unassigned',
          images: p.images,
          isStockAvailable: p.isStockAvailable,
          totalStock: p.variants && p.variants.length > 0 ? totalStock : (p.isStockAvailable ? 10 : 0),
          salesCount: stats.salesCount,
          totalRevenue: stats.totalRevenue,
        };
      })
      .sort((a, b) => b.salesCount - a.salesCount || b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // --- Recent Orders ---
    const recentOrders = allOrders.slice(0, 8).map((o) => ({
      id: o._id,
      _id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.shippingAddress?.fullName || o.user?.name || 'Customer',
      customerEmail: o.user?.email || '',
      customerCity: o.shippingAddress?.city || '',
      items: (o.items || []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        image: i.image,
      })),
      itemsSummary: (o.items || []).map((i) => i.name).join(', '),
      total: o.total,
      status: o.orderStatus || 'pending',
      paymentStatus: o.paymentStatus || 'pending',
      paymentMethod: o.paymentMethod || 'upi',
      createdAt: o.createdAt,
    }));

    // --- Recent Customers ---
    const recentCustomers = allUsers.slice(0, 5).map((u) => {
      const defaultAddr = u.addresses?.find((a) => a.isDefault) || u.addresses?.[0];
      const userOrders = allOrders.filter((o) => o.user?._id?.toString() === u._id.toString());
      const userSpent = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        city: defaultAddr?.city || 'India',
        state: defaultAddr?.state || '',
        country: defaultAddr?.country || 'India',
        createdAt: u.createdAt,
        totalSpent: userSpent,
        ordersCount: userOrders.length,
        status: u.isEmailVerified ? 'Active' : 'Pending',
      };
    });

    // --- Order Status Breakdown ---
    const orderStatusCounts = {
      pending: allOrders.filter((o) => o.orderStatus === 'pending').length,
      confirmed: allOrders.filter((o) => o.orderStatus === 'confirmed').length,
      processing: allOrders.filter((o) => o.orderStatus === 'processing').length,
      shipped: allOrders.filter((o) => o.orderStatus === 'shipped').length,
      delivered: allOrders.filter((o) => o.orderStatus === 'delivered').length,
      cancelled: allOrders.filter((o) => o.orderStatus === 'cancelled').length,
      returned: allOrders.filter((o) => o.orderStatus === 'returned').length,
    };

    return res.status(200).json({
      status: true,
      data: {
        kpis: {
          totalRevenue: Math.round(totalRevenue),
          totalOrders: totalOrdersCount,
          avgOrderValue,
          totalCustomers: totalCustomersCount,
          lowStockCount: lowStockProducts.length,
          revenueGrowth: {
            value: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}%`,
            isPositive: revenueGrowth >= 0,
          },
          ordersGrowth: {
            value: `${ordersGrowth >= 0 ? '+' : ''}${ordersGrowth}%`,
            isPositive: ordersGrowth >= 0,
          },
          aovGrowth: {
            value: `${aovGrowth >= 0 ? '+' : ''}${aovGrowth}%`,
            isPositive: aovGrowth >= 0,
          },
        },
        chartData: {
          '7d': chart7d,
          '30d': chart30d,
          '90d': chart90d,
          YTD: chartYTD,
        },
        categoryData,
        topCategory,
        topSellingProducts,
        recentOrders,
        recentCustomers,
        orderStatusCounts,
      },
    });
  } catch (error) {
    console.error('[Admin Analytics Dashboard Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to compute dashboard analytics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get detailed executive analytics & financial reports
 * @route   GET /api/analytics/reports
 * @access  Private/Admin
 */
export const getExecutiveReports = async (req, res) => {
  try {
    const now = new Date();
    const allOrders = await Order.find({ orderStatus: { $ne: 'cancelled' } }).lean();

    // Compute monthly breakdown for current fiscal year
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = now.getMonth();

    const monthlyFinancials = [];
    for (let m = 0; m <= currentMonthIdx; m++) {
      const dStart = new Date(now.getFullYear(), m, 1);
      const dEnd = new Date(now.getFullYear(), m + 1, 1);

      const mOrders = allOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= dStart && orderDate < dEnd;
      });

      const mRevenue = mOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const mAov = mOrders.length > 0 ? Math.round(mRevenue / mOrders.length) : 0;

      monthlyFinancials.push({
        month: months[m],
        revenue: Math.round(mRevenue),
        orders: mOrders.length,
        aov: mAov,
      });
    }

    return res.status(200).json({
      status: true,
      data: {
        fiscalYear: now.getFullYear(),
        monthlyFinancials,
      },
    });
  } catch (error) {
    console.error('[Admin Executive Reports Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to generate financial reports',
      error: error.message,
    });
  }
};
