import { compare } from 'bcrypt';
import { User } from '../models/user.js';
import { cookieOptions, sendToken } from '../utils/features.js';
import { catchAsync } from '../middlewares/error.js';
import { ErrorHandler } from '../utils/utility.js';

// create a user and store cookies
const newUsers = async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;
    const avatar = {
      public_id: 'hi',
      url: 'image',
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
  const { name } = req.query;
  res.status(200).json({
    success: true,
    message : name,
  });
});

export { login, newUsers, getMyProfile, logout, searchUser };
