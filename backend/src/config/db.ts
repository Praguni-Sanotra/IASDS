import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hybridtimetable';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connection successful.');
  } catch (error) {
    console.error('❌ MongoDB initial connection failed.');
    console.error(error);
    console.warn('⚠️ Mongoose will continue to attempt reconnection in the background.');
  }
};
