import jwt from 'jsonwebtoken';
import { ErrorHandler } from '../utils/utility.js';
import { catchAsync } from './error.js';

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

export { isAuthenticated, isAdmin };
