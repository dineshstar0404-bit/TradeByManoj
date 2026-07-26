const mongoose = require('mongoose');

// Cached across invocations so repeated serverless cold starts (Vercel)
// reuse the same connection instead of exhausting Atlas's connection limit.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((conn) => {
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`❌ MongoDB error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
