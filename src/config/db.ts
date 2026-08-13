import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const options: mongoose.ConnectOptions = {
    autoIndex: true, // Build indexes; set to false in high-load production
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  };

  const dbUri = process.env.MONGO_URI;

  if (!dbUri) {
    throw new Error('MONGO_URI is not defined in .env file ❌');
  }

  mongoose.connection.on('connected', () => console.log('MongoDB Connected 🚀'));
  mongoose.connection.on('error', (err) => console.error(`MongoDB Error: ${err} ❌`));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB Disconnected ⚠️'));

  try {
    await mongoose.connect(dbUri, options);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;