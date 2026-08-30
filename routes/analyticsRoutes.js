import express from 'express';
import {
  getDashboardMetrics,
  getExecutiveReports,
} from '../controllers/analyticsController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Dashboard live metrics & charts
router.get('/dashboard', protect, adminOnly, getDashboardMetrics);

// Executive financials & reports
router.get('/reports', protect, adminOnly, getExecutiveReports);

export default router;
