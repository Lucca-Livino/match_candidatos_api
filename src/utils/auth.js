import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins';
import mongoose from 'mongoose';

const getTrustedOrigins = () => {
  if (!process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    return ['http://localhost:3000', 'http://localhost:5173'];
  }

  return process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const getBaseUrl = () => {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }

  const port = process.env.APP_PORT || process.env.API_PORT || 5000;
  return `http://localhost:${port}`;
};

const getMongoDatabase = () => {
  const database = mongoose.connection?.db;

  if (!database) {
    throw new Error('Conexao MongoDB nao inicializada para Better Auth.');
  }

  return database;
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me',
  baseURL: getBaseUrl(),
  basePath: '/api/auth',
  database: mongodbAdapter(getMongoDatabase()),
  plugins: [bearer()],
  emailAndPassword: {
    enabled: true,
    autoSignIn: process.env.NODE_ENV !== 'production',
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: getTrustedOrigins(),
});
