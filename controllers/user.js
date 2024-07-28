import { compare } from 'bcrypt';
import { User } from '../models/user.js';
import {
  cookieOptions,
  emitEvent,
  getOtherMember,
  sendToken,
  uploadFilesToCloudinary,
} from '../utils/features.js';
import { catchAsync } from '../middlewares/error.js';
import { ErrorHandler } from '../utils/utility.js';
import { Chat } from '../models/chat.js';
import { Request } from '../models/request.js';
import { NEW_FRIEND_REQUEST, REFETCH_CHAT } from '../constants/events.js';

// create a user and store cookies
const newUsers = catchAsync(async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;

    if (!req.file) {
      return next(new ErrorHandler('Please upload file'));
    }

    const exsitsUser = await User.findOne({ username });
    if (exsitsUser) {
      return next(new ErrorHandler('username already exists', 400));
    }
    const result = await uploadFilesToCloudinary([req.file]);
    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };

    const user = await User.create({
      name,
      username,
      password,
      bio,
      avatar,
    });
    sendToken(res, user, 201, 'User created');
  } catch (error) {
    next(error);
  }
});

const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select('+password');
  if (!user) {
    return next(new ErrorHandler('Invalid Username', 404));
  }
  const isMatchPassword = await compare(password, user.password);
  if (!isMatchPassword) {
    return next(new ErrorHandler('Invalid Password', 404));
  }
  sendToken(res, user, 200, `Welcome Back ${user.name}.`);
});

const getMyProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user);
  res.status(200).json({
    success: true,
    user,
  });
});

const logout = catchAsync(async (req, res, next) => {
  res
    .cookie('ak-token', '', { ...cookieOptions, maxAge: 0 })
    .status(200)
    .json({
      success: true,
      message: 'Logout Sucessfully...!',
    });
});

const searchUser = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  // find chat inside me
  const myChat = await Chat.find({ groupChat: false, members: req.user });

  // all user from my chat means my friend who accept my friend request
  const allUserFromMyChat = myChat.flatMap((chat) => chat.members);

  // Ensure the current user is excluded
  const exclusionList = [...new Set([...allUserFromMyChat, req.user])];

  // find other friend
  const allFrienFind = await User.find({
    _id: { $nin: exclusionList },
    name: { $regex: name, $options: 'i' },
  });

  const users = allFrienFind.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  res.status(200).json({
    success: true,
    users: users,
  });
});

const sendFriendRequest = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  const senderId = req.user;
  const receiverId = userId;

  // Find any existing request
  const request = await Request.findOne({
    $or: [
      { sender: senderId, reciver: receiverId },
      { sender: receiverId, reciver: senderId },
    ],
  });

  if (request) {
    return next(new ErrorHandler('Request already send', 404));
  }
  await Request.create({
    sender: req.user,
    reciver: userId,
  });
  emitEvent(req, NEW_FRIEND_REQUEST, [userId]);
  res.status(200).json({
    success: true,
    message: 'Friend request send sucessfully...!',
  });
});

const acceptFriendRequest = catchAsync(async (req, res, next) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate('sender', 'name')
    .populate('reciver', 'name');

  if (!request) {
    return next(new ErrorHandler('Request not found', 404));
  }
  if (request.reciver._id.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler('You are not allowed to accept this request', 400)
    );
  }
  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: 'Request Declined',
    });
  }
  const members = [request.reciver._id, request.sender._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.reciver.name}`,
    }),
    request.deleteOne(),
  ]);
  emitEvent(req, REFETCH_CHAT, members);
  res.status(200).json({
    success: true,
    message: 'Request Accepted',
    senderId: request.sender._id,
  });
});

const getAllNotifications = catchAsync(async (req, res, next) => {
  const request = await Request.find({ reciver: req.user }).populate(
    'sender',
    'name avatar'
  );

  const myAllrequest = request.map(({ _id, sender }) => {
    return {
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    };
  });

  res.status(200).json({
    success: true,
    notifications: myAllrequest,
  });
});

const getMyFriend = catchAsync(async (req, res, next) => {
  const chatId = req.query.chatId;
  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate('members', 'name avatar');

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);
    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId).populate('members', 'name avatar');
    const avilableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(200).json({
      success: true,
      friends: avilableFriends,
    });
  } else {
    res.status(200).json({
      success: true,
      friends,
    });
  }
});

export {
  login,
  newUsers,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getAllNotifications,
  getMyFriend,
};
