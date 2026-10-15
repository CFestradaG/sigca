import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoHost = process.env.MONGO_HOST ?? '127.0.0.1';
  const mongoPort = Number(process.env.MONGO_PORT ?? 27017);
  const databaseName = process.env.MONGO_DATABASE ?? 'sigca';

  await mongoose.connect(`mongodb://${mongoHost}:${mongoPort}/${databaseName}`, {
    auth: {
      username: process.env.MONGO_USER ?? process.env.MONGO_ROOT_USER ?? 'sigca_dev',
      password: process.env.MONGO_PASSWORD ?? process.env.MONGO_ROOT_PASSWORD,
    },
    authSource: process.env.MONGO_AUTH_SOURCE ?? 'admin',
    serverSelectionTimeoutMS: 5000,
  });
}