import mongoose from 'mongoose';

/**
 * Get human-readable connection status
 */
export const getDBStatus = () => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;

  return {
    stateCode,
    status: states[stateCode] || 'Unknown',
    isConnected,
    host: isConnected ? mongoose.connection.host : null,
    database: isConnected ? mongoose.connection.name : null,
    environment: process.env.NODE_ENV || 'development'
  };
};

/**
 * Connect to MongoDB based on NODE_ENV mode
 */
export const connectDB = async () => {
  const env = process.env.NODE_ENV || 'development';

  // Determine URI based on environment mode
  let uri = process.env.MONGO_URI;

  if (env === 'production') {
    uri = process.env.MONGO_URI_PROD || process.env.MONGO_URI;
  } else if (env === 'test') {
    uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
  } else {
    uri = process.env.MONGO_URI_DEV || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce';
  }

  if (!uri) {
    console.error(`[MongoDB Error]: No connection URI specified for environment "${env}".`);
    process.exit(1);
  }

  // Setup connection event listeners
  mongoose.connection.on('connected', () => {
    console.log(`[MongoDB Event]: Connected successfully to [${mongoose.connection.name}] on host [${mongoose.connection.host}] (${env} mode)`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB Event Error]: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn(`[MongoDB Event]: Connection disconnected.`);
  });

  try {
    const conn = await mongoose.connect(uri);
    console.log(`\n------------------------------------------------------`);
    console.log(`  MongoDB Connection Initialized`);
    console.log(`  Environment : ${env.toUpperCase()}`);
    console.log(`  Cluster Host: ${conn.connection.host}`);
    console.log(`  Database    : ${conn.connection.name}`);
    console.log(`  Status      : ${getDBStatus().status}`);
    console.log(`------------------------------------------------------\n`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Critical Connection Failure]: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
