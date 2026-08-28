import express from 'express';
import {
  registerUser,
  verifyEmailOtp,
  loginWithPassword,
  requestLoginOtp,
  loginWithOtp,
  adminLogin,
  setupInitialAdmin,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', registerUser);
router.post('/verify-email', verifyEmailOtp);

router.post('/login', loginWithPassword);
router.post('/request-otp', requestLoginOtp);
router.post('/login-otp', loginWithOtp);

router.post('/admin-login', adminLogin);
router.post('/admin-setup', setupInitialAdmin);

router.get('/profile', protect, (req, res) => {
  res.status(200).json({
    status: true,
    user: req.user,
  });
});

export default router;
