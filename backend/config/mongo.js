const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.set('bufferCommands', false);

const globalForMongo = global;
if (!globalForMongo.mongoConnectionPromise) {
  globalForMongo.mongoConnectionPromise = null;
}

function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }
  if (globalForMongo.mongoConnectionPromise) {
    return globalForMongo.mongoConnectionPromise;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    return Promise.reject(new Error('MONGO_URI is not set. Add it in the Vercel Environment Variables UI.'));
  }

  globalForMongo.mongoConnectionPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return mongoose.connection;
    })
    .catch((err) => {
      globalForMongo.mongoConnectionPromise = null;
      throw err;
    });

  return globalForMongo.mongoConnectionPromise;
}

async function disconnectMongo() {
  globalForMongo.mongoConnectionPromise = null;
  await mongoose.disconnect();
}

module.exports = { connectMongo, disconnectMongo, mongoose };