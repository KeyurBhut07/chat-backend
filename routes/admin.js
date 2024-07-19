import express from 'express';
import {
  adminLogin,
  adminLogOut,
  allChats,
  allMessages,
  allUsers,
  getDashboardStats,
} from '../controllers/admin.js';
import { isAdmin } from '../middlewares/auth.js';
const router = express.Router();

router.post('/verify', adminLogin);
router.get('/logout', adminLogOut);

// only admin can access the routes
router.use(isAdmin);

router.get('/');
router.get('/users', allUsers);
router.get('/chats', allChats);
router.get('/messages', allMessages);

router.get('/stats', getDashboardStats);

export default router;
