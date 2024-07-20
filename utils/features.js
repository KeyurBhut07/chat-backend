import jwt from 'jsonwebtoken';
import { userSocketIDs } from '../app.js';

export const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: 'none',
  httpOnly: true,
  secure: true,
};

export const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user?._id }, process.env.JWT_SECERET);
  res.cookie('ak-token', token, cookieOptions).status(code).json({
    success: true,
    user,
    message,
  });
};

export const emitEvent = (req, event, users, data) => {
  console.log('Emiting Event', event);
};

export const getOtherMember = (members, userId) => {
  return members.find((member) => member._id.toString() != userId.toString());
};

export const deleteilesFromCloudinary = async (publicId) => {};

export const getSockets = (users = []) => {
  return users.map((user) => userSocketIDs.get(user._id).toString());
};
