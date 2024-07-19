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
import { NEW_MESSAGE } from './constants/events.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {});

const PORT = process.env.PORT;
connectDB();

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Hello Word');
});

app.use('/user', userRouter);
app.use('/chat', chatRouter);
app.use('/admin', adminRouter);

// socket coneection
io.on('connection', (socket) => {
  console.log('a user connected', socket.id);
  socket.on(NEW_MESSAGE, (data) => {
    console.log('new message', data);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
