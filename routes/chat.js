import express from 'express';
const router = express.Router();

import { isAuthenticated } from '../middlewares/auth.js';
import { getMyChat, newGroupChat } from '../controllers/chat.js';

// must be login to access to routes
router.use(isAuthenticated);

router.post("/new", newGroupChat)
router.get("/my", getMyChat)

export default router;
