import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    content: { type: String },
    attachments: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    sender: { type: Types.ObjectId, ref: 'Users', required: true },
    chat: { type: Types.ObjectId, ref: 'Chats', required: true },
  },
  { timestamps: true }
);

export const Message = model('Messages', schema);
