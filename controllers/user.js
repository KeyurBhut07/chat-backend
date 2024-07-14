import { compare } from 'bcrypt';
import { User } from '../models/user.js';
import { cookieOptions, emitEvent, sendToken } from '../utils/features.js';
import { catchAsync } from '../middlewares/error.js';
import { ErrorHandler } from '../utils/utility.js';
import { Chat } from '../models/chat.js';
import { Request } from '../models/request.js';
import { NEW_FRIEND_REQUEST } from '../constants/events.js';

// create a user and store cookies
const newUsers = async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;
    const avatar = {
      public_id: 'hi',
      url: 'image',
    };

    const exsitsUser = await User.findOne({ username });
    if (exsitsUser) {
      return next(new ErrorHandler('username already exists', 400));
    }

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
};

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
  const request = await Request.findOne({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  });
  if (request) {
    return next(new ErrorHandler('You have already sent a friend request', 400));
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

export { login, newUsers, getMyProfile, logout, searchUser, sendFriendRequest };
