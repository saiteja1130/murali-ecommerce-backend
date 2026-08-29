import express from 'express';
import {
  getUsers,
  getUserById,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
} from '../controllers/userController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User Address Management Routes (Protected for logged in users)
router.route('/addresses')
  .get(protect, getUserAddresses)
  .post(protect, addUserAddress);

router.route('/addresses/:addressId')
  .put(protect, updateUserAddress)
  .delete(protect, deleteUserAddress);

router.route('/addresses/:addressId/default')
  .patch(protect, setDefaultUserAddress);

// Admin User Directory Routes
router.route('/')
  .get(protect, adminOnly, getUsers);

router.route('/:id')
  .get(protect, adminOnly, getUserById);

export default router;
