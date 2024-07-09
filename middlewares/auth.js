import  jwt from 'jsonwebtoken';
import { ErrorHandler } from '../utils/utility.js';
import { catchAsync } from './error.js';

const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies['ak-token'];
  if (!token) {
    return next(
      new ErrorHandler('Please login to access this routes...!', 401)
    );
  }
  const decodeToken = jwt.verify(token,process.env.JWT_SECERET)
  req.user = decodeToken._id
  next()
});

export { isAuthenticated };