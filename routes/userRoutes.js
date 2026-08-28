import express from 'express';
import { getUsers, getUserById } from '../controllers/userController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getUsers);

router.route('/:id')
  .get(protect, adminOnly, getUserById);

export default router;
