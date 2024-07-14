import express from 'express';
const router = express.Router();

import { isAuthenticated } from '../middlewares/auth.js';
import {
  addMembers,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyChat,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMember,
  renameGroup,
  sendattachmentChat,
} from '../controllers/chat.js';
import { attachmentMulter } from '../middlewares/multer.js';

// must be login to access to routes
router.use(isAuthenticated);

router.post('/new', newGroupChat);
router.get('/my', getMyChat);
router.get('/my/groups', getMyGroups);
router.put('/add-members', addMembers);
router.put('/remove-members', removeMember);
router.delete('/leave/:id', leaveGroup);

// send attachment to chat
router.post('/message', attachmentMulter, sendattachmentChat);

// get chat message
router.get("/message/:id", getMessages)

// Get Chat Deatils , rename , delete
router.route('/:id').get(getChatDetails).put(renameGroup).delete(deleteChat);

export default router;
