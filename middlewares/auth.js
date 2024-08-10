import jwt from 'jsonwebtoken';
import { ErrorHandler } from '../utils/utility.js';
import { catchAsync } from './error.js';
import { User } from '../models/user.js';

const isAuthenticated = catchAsync(async (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (!token) {
    return next(
      new ErrorHandler('Please login to access this routes...!', 401)
    );
  }
  const decodeToken = jwt.verify(token, process.env.JWT_SECERET);
  req.user = decodeToken._id;
  next();
});

const isAdmin = catchAsync(async (req, res, next) => {
  const token = req.headers['chattu-admin-token'];
  if (!token) {
    return next(new ErrorHandler('Only admin can access this routes...!', 401));
  }
  const seceretKey = jwt.verify(token, process.env.JWT_SECERET);
  const adminSecretKey = process.env.ADMIN_SECERET || 'AKChatApp';
  const isMatch = seceretKey === adminSecretKey;
  if (!isMatch) {
    return next(new ErrorHandler('Invalid Admin Secret Key', 401));
  }
  next();
});

const socketAutheticater = async (token, socket, next) => {
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECERET);
    const user = await User.findById(decodedToken._id);
    if (!user) {
      return next(new Error('User not found', 404));
    }
    // Attach the user to the socket object
    socket.user = user;
    return next();
  } catch (error) {
    console.log('Authentication error: ', error);
    return next(new Error('Invalid token', 401));
  }
};

export { isAuthenticated, isAdmin, socketAutheticater };
