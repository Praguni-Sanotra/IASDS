import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hybridtimetable';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export const connectDB = async () => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB connection successful.');
      return;
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB connection failed. Retry ${retries}/${MAX_RETRIES}`);
      console.error(error);
      
      if (retries >= MAX_RETRIES) {
        console.error('🚨 Max retries reached. Exiting...');
        process.exit(1);
      }
      
      console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};
