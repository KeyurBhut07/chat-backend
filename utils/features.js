import jwt from 'jsonwebtoken';
import { userSocketIDs } from '../app.js';
import { v4 as uuid } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'None',
  maxAge: 24 * 60 * 60 * 1000,
};

export const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user?._id }, process.env.JWT_SECERET, {
    expiresIn: '1h',
  });
  res.status(code).json({
    token,
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

export const base64 = (file) => {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

export const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64(file),
        {
          resource_type: 'auto',
          public_id: uuid(),
        },
        (error, result) => {
          if (error) reject(error);
          resolve(result);
        }
      );
    });
  });
  try {
    const results = await Promise.all(uploadPromises);
    const fromatedResults = results.map((result) => ({
      url: result.secure_url,
      public_id: result.public_id,
    }));
    return fromatedResults;
  } catch (error) {}
};

export const deleteilesFromCloudinary = async (publicId) => {};

export const getSockets = (users = []) => {
  return users.map((user) => userSocketIDs.get(user._id).toString());
};
