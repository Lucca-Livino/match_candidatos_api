import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const connectTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
};

export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  const collectionKeys = Object.keys(collections);

  for (const key of collectionKeys) {
    await collections[key].deleteMany({});
  }
};

export const disconnectTestDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  if (mongoServer) {
    await mongoServer.stop();
  }
};
