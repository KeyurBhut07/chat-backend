import { Schema, Types, model } from 'mongoose';

const schema = new Schema(
  {
    name: { type: String, required: true },
    groupChat: { type: Boolean, default: false },
    creator: { type: Types.ObjectId, ref: 'Users' },
    members: [{ type: Types.ObjectId, ref: 'Users' }],
  },
  { timestamps: true }
);

export const Chat = model('Chats', schema);
