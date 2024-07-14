import { catchAsync } from '../middlewares/error.js';
import { Chat } from '../models/chat.js';
import {
  deleteilesFromCloudinary,
  emitEvent,
  getOtherMember,
} from '../utils/features.js';
import { ErrorHandler } from '../utils/utility.js';
import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE_ALERT,
  REFETCH_CHAT,
} from '../constants/events.js';
import { User } from '../models/user.js';
import { Message } from '../models/message.js';

// create my group
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

// get my chat
const getMyChat = catchAsync(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    'members',
    'name avatar'
  );

  const transformchat = chats.map(({ id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user);
    return {
      id,
      name: groupChat ? name : otherMember.name,
      members: members.reduce((prev, curr) => {
        if (curr._id != req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
    };
  });

  return res.status(200).json({
    success: true,
    message: 'My Chat successfully',
    chats: transformchat,
  });
});

// get my group
const getMyGroups = catchAsync(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate('members', 'name avatar');

  const transformChat = chats.map(({ _id, members, groupChat, name }) => ({
    _id,
    name,
    groupChat,
    members: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({
    success: true,
    groups: transformChat,
  });
});

// add members
const addMembers = catchAsync(async (req, res, next) => {
  const { chatId, members } = req.body;

  if (!members || members.length < 1) {
    return next(new ErrorHandler('Please add members', 400));
  }
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler('Chat not found', 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler('This is not group chat', 400));
  }
  if (chat.creator.toString() != req.user.toString()) {
    return next(new ErrorHandler('You are not allowed to add member', 400));
  }
  const allNewMembersPromise = members.map((i) => User.findById(i));
  const allNewMembers = await Promise.all(allNewMembersPromise);

  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...uniqueMembers);
  if (chat.members.length > 100) {
    return next(new ErrorHandler('You can not add more than 100 members', 400));
  }
  await chat.save();

  const allUserName = allNewMembers.map((i) => i.name).join(',');

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUserName} hase been added to ${chat.name} group.`
  );

  emitEvent(req, REFETCH_CHAT, chat.members);

  return res.status(200).json({
    success: true,
    message: 'Members added successfully',
  });
});

// remove members
const removeMember = catchAsync(async (req, res, next) => {
  const { userId, chatId } = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, 'name'),
  ]);
  if (!chat) {
    return next(new ErrorHandler('Chat not found.', 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler('This is not group chat.', 400));
  }
  if (chat.creator.toString() != req.user.toString()) {
    return next(new ErrorHandler('You are not allowed to add member.', 400));
  }
  if (chat.members.length <= 3) {
    return next(new ErrorHandler('Group must have at leat 3 members.', 400));
  }
  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await chat.save();
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userThatWillBeRemoved.name} has been removed from ${chat.name} group.`
  );
  emitEvent(req, REFETCH_CHAT, chat.members);
  return res.status(200).json({
    success: true,
    message: 'Members removed successfully',
  });
});

// leave chat
const leaveGroup = catchAsync(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler('Chat not found.', 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler('This is not group chat.', 400));
  }

  const remainingMember = chat.members.filter(
    (member) => member.toString() !== req.user
  );

  if (chat.creator.toString() === req.user.toString()) {
    const newCreatore = remainingMember[0];
    chat.creator = newCreatore;
  }
  chat.members = remainingMember;
  const user = await User.findById(req.user, 'name');

  emitEvent(
    req,
    ALERT,
    remainingMember,
    `${user} has left ${chat.name} group.`
  );

  return res.status(200).json({
    success: true,
    message: 'Members removed successfully',
  });
});

// send attchment to multer
const sendattachmentChat = catchAsync(async (req, res, next) => {
  const { chatId } = req.body;

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, 'name'),
  ]);
  if (!chat) {
    return next(new ErrorHandler('Chat not found.', 404));
  }

  const files = req.files || [];
  if (files.length < 1) {
    return next(new ErrorHandler('Pleaase provide attachment.', 400));
  }

  // upload files in cloudnary
  const attachments = [];
  const messageForDB = {
    content: '',
    attachments,
    sender: req.user,
    chat: chatId,
  };
  const messageForrealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_ATTACHMENT, chat.members, {
    message: messageForrealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message,
  });
});

// get Chat details
const getChatDetails = catchAsync(async (req, res, next) => {
  if (req.body.populate === 'true') {
    const chat = await Chat.findById(req.params.id)
      .populate('members', 'name avatar')
      .lean();
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    if (!chat) {
      return next(new ErrorHandler('Chat not found.', 404));
    }
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return next(new ErrorHandler('Chat not found.', 404));
    }
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

const renameGroup = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) {
    return next(new ErrorHandler('Chat not found.', 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler('This is not a group chat.', 404));
  }
  chat.name = req.body.name;
  await chat.save();
  emitEvent(req, REFETCH_CHAT, chat.members);
  return res.status(200).json({
    success: true,
    message: 'Group renamed successfully',
  });
});

const deleteChat = catchAsync(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler('Chat not found.', 404));
  }
  const members = chat.members;
  if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler('You are not the allowed to delete group.', 403)
    );
  }
  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return next(
      new ErrorHandler('You are not the allowed to delete chat.', 403)
    );
  }
  // here wa can delete message of this chat and also delete attchment from cloundainar

  const messagesWithAttachment = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];
  messagesWithAttachment.forEach((message) => {
    message.attachments.forEach((attachment) => {
      if (attachment.public_id) {
        public_ids.push(attachment.public_id);
      }
    });
  });
  console.log('public_ids: ', public_ids);

  await Promise.all([
    deleteilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHAT, members);

  return res.status(200).json({
    success: true,
    message: 'Chat deleted successfully',
  });
});

const getMessages = catchAsync(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1, limit = 20 } = req.body;
  const skip = (page - 1) * limit;
  const [messages, totalMessageCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar')
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);
  const totalPages = Math.ceil(totalMessageCount / limit);
  return res.status(200).json({
    success: true,
    messages: messages.reverse(), // reverse to maintain chronological order
    totalPages,
    totalMessageCount,
    currentPage: page,
  });
});

export {
  newGroupChat,
  getMyChat,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendattachmentChat,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};
