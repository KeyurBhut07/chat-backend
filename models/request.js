import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'accepted', 'rejected'],
    },
    sender: { type: Types.ObjectId, ref: 'Users', required: true },
    reciver: { type: Types.ObjectId, ref: 'Users', required: true },
  },
  { timestamps: true }
);

export const Request = model('Requests', schema);
