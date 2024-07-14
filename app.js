import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './utils/db.js';
import { errorMiddleware } from './middlewares/error.js';
import cookieParser from 'cookie-parser';

import userRouter from './routes/user.js';
import chatRouter from './routes/chat.js';
import { createMessageInChat, createingleChats, groupChat } from './seeders/chats.js';


const app = express();
const PORT = process.env.PORT;
connectDB();

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('Hello Word');
});

app.use('/user', userRouter);
app.use('/chat', chatRouter);

app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
