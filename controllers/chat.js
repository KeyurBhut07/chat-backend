import { catchAsync } from '../middlewares/error.js';
import { Chat } from '../models/chat.js';
import { emitEvent } from '../utils/features.js';
import { ErrorHandler } from '../utils/utility.js';
import { ALERT, REFETCH_CHAT } from '../constants/events.js';

const newGroupChat = catchAsync(async (req, res, next) => {
  const { name, members } = req.body;
  if (members.length < 2) {
    return next(new ErrorHandler('Group must have at least 2 members', 400));
  }

  const allMembers = [...members, req.user];

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welecome to ${name} group.`);
  // controll the group member.
  emitEvent(req, REFETCH_CHAT, members);

  return res.status(201).json({
    success: true,
    message: 'Group created successfully',
  });
});

const getMyChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.find({ members: req.user }).populate(
    'members',
    'name avatar'
  );

  return res.status(201).json({
    success: true,
    message: 'Group created successfully',
    chat
  });
});

export { newGroupChat, getMyChat };
