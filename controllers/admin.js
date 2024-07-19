import { catchAsync } from '../middlewares/error.js';
import { Chat } from '../models/chat.js';
import { Message } from '../models/message.js';
import { User } from '../models/user.js';
import { cookieOptions } from '../utils/features.js';
import { ErrorHandler } from '../utils/utility.js';
import jwt from 'jsonwebtoken';

const adminLogin = catchAsync(async (req, res, next) => {
  const { seceretKey } = req.body;
  const adminSecretKey = process.env.ADMIN_SECERET || 'AKChatApp';
  const isMatch = seceretKey === adminSecretKey;
  if (!isMatch) {
    return next(new ErrorHandler('Invalid Admin Secret Key', 401));
  }
  const token = jwt.sign(seceretKey, process.env.JWT_SECERET);
  res
    .status(200)
    .cookie('chattu-admin-token', token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 1000,
    })
    .json({
      success: true,
      message: 'Welecome BOSS...!',
    });
});

const allUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({});
  const transformat = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({
          members: _id,
          groupChat: true,
        }),
        Chat.countDocuments({
          members: _id,
          groupChat: false,
        }),
      ]);
      return { _id, name, username, avatar: avatar.url, groups, friends };
    })
  );
  res.status(200).json({
    status: 'success',
    data: transformat,
  });
});

const allChats = catchAsync(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate('members', 'name avatar')
    .populate('creator', 'name avatar');

  const transFormChats = await Promise.all(
    chats.map(async ({ members, creator, _id, groupChat, name }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => {
          return { _id, name, avatar: avatar.url };
        }),
        creator: {
          name: creator?.name || '',
          avatar: creator?.avatar.url || '',
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: transFormChats,
  });
});

const allMessages = catchAsync(async (req, res, next) => {
  const messages = await Message.find({})
    .populate('sender', 'name avatar')
    .populate('chat', 'groupChat');

  const transformMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
      _id,
      content,
      attachments,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );
  res.status(200).json({
    status: 'success',
    data: transformMessages,
  });
});

const getDashboardStats = catchAsync(async (req, res, next) => {
  const [groupChatCounts, userCounts, messageCounts, totalChatCounts] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const last7DaysMessage = await Message.find({
    createdAt: { $gte: last7Days, $lte: today },
  }).select('createdAt');

  const messages = new Array(7).fill(0);
  const dayInMiliseconds = 1000 * 60 * 60 * 24;
  last7DaysMessage.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
    const index = Math.floor(indexApprox);
    messages[6 - index]++;
  });

  const stats = {
    groupChatCounts,
    userCounts,
    messageCounts,
    totalChatCounts,
    messagesCharts: messages,
  };
  res.status(200).json({
    status: 'success',
    data: stats,
  });
});

const adminLogOut = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .cookie('chattu-admin-token', '', {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: 'Logout Boss By By...!',
    });
});

export {
  allUsers,
  allChats,
  allMessages,
  getDashboardStats,
  adminLogin,
  adminLogOut,
};
