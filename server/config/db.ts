import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sigca_armonia';

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  if (isConnected) return true;

  try {
    // Attempt connection with 3-second timeout so app boot is immediate if Mongo isn't running locally
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected successfully to ${MONGODB_URI}`);
    return true;
  } catch (error) {
    console.warn(`[Database] MongoDB not reachable at ${MONGODB_URI}. Running in resilient memory-store mode.`);
    isConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
