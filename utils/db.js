import mongoose from 'mongoose';

const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('Database Connected Sucessfully....!');
    })
    .catch((error) => {
      console.log('Error while connecting to Database....!');
    });
};

export { connectDB };
