import express from 'express';
const router = express.Router();
import {
  getMyProfile,
  login,
  logout,
  newUsers,
  searchUser,
} from '../controllers/user.js';
import { signleAvatar } from '../middlewares/multer.js';
import { isAuthenticated } from '../middlewares/auth.js';

router.post('/new', signleAvatar, newUsers);
router.post('/login', login);

// must be login to access to routes
router.use(isAuthenticated);
router.get('/me', getMyProfile);
router.get('/logout', logout);
router.get('/search', searchUser);

export default router;
