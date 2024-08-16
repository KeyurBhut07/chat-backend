import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './utils/db.js';
import { errorMiddleware } from './middlewares/error.js';
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.js';
import chatRouter from './routes/chat.js';
import adminRouter from './routes/admin.js';
//for socket io
import { Server } from 'socket.io';
import { createServer } from 'http';
import {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  START_TYPING,
  STOP_TYPING,
} from './constants/events.js';
import { v4 as uuid } from 'uuid';
import { getSockets } from './utils/features.js';
import { Message } from './models/message.js';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import { socketAutheticater } from './middlewares/auth.js';

// map
const userSocketIDs = new Map();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://127.0.0.1:5173',
    credentials: true,
  },
});

// instance set in app
app.set('io', io);

const PORT = process.env.PORT;
connectDB();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: 'http://127.0.0.1:5173',
    credentials: true,
  })
);

app.get('/', (req, res) => {
  res.send('Hello Word');
});

app.use('/api/v1/user', userRouter);
app.use('/api/v1/chats', chatRouter);
app.use('/admin', adminRouter);

// socket io middleware
io.use(async (socket, next) => {
  try {
    // Extract the token from the authorization header
    const token =
      socket.request.headers.authorization &&
      socket.request.headers.authorization.split(' ')[1];
    if (!token) {
      return next(new Error('Please login to access this route!', 401));
    }
    // Call the socketAuthenticator function
    await socketAutheticater(token, socket, next);
  } catch (error) {
    console.log('error: ', error);
    return next(new Error('Authentication error', 401));
  }
});

// socket coneection
io.on('connection', (socket) => {
  // tem user
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);
  console.log('userSocketIDs: ', userSocketIDs);

  // mwssage event
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    // message for realTime
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    // message from DB
    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    // active user
    const membersSocket = getSockets(members);

    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });
    // save databse
    try {
      await Message.create(messageForDB);
    } catch (error) {
      console.log('error: ', error);
    }
  });

  // start typing
  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  // stop typing
  socket.on(STOP_TYPING, ({ members, chatId }) => {
    console.log('chatId: ', chatId);
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on('disconnect', () => {
    userSocketIDs.delete(user._id.toString());
  });
});

app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

export { userSocketIDs };
