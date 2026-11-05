const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is not set. Create Backend/.env (copy from Backend/.env.example) and set MONGODB_URI.'
      );
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 9 defaults are good, no need for deprecated options
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
