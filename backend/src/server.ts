import dotenv from 'dotenv';
import express, { type ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { servicesRouter } from './modules/services/services.routes.js';
import { connectDatabase } from './config/database.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '../.env' });

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  response.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/usuarios', usersRouter);
app.use('/api/servicios', servicesRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const statusCode =
    typeof error === 'object' && error !== null && 'status' in error &&
    typeof error.status === 'number' && error.status >= 400 && error.status < 500
      ? error.status
      : 500;

  if (statusCode === 500) console.error('Unhandled API error:', error);
  response.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno del servidor.' : 'Solicitud inválida.',
  });
};

app.use(errorHandler);

async function start() {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  const jwtExpiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600);
  if (!Number.isInteger(jwtExpiresInSeconds) || jwtExpiresInSeconds < 60 || jwtExpiresInSeconds > 86400) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be an integer between 60 and 86400.');
  }

  await connectDatabase();

  app.listen(port, '0.0.0.0', () => {
    console.log(`SIGCA API listening on port ${port}`);
  });
}

start().catch((error: unknown) => {
  console.error('Failed to start SIGCA API:', error);
  process.exitCode = 1;
});