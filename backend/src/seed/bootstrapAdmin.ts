import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database.js';
import { UserModel } from '../modules/users/user.model.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? '../.env' });

async function bootstrapAdmin() {
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!name || !email || !password || password.length < 12) {
    throw new Error('Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters in the local environment.');
  }

  await connectDatabase();
  if (await UserModel.exists({ email })) {
    throw new Error('An account with BOOTSTRAP_ADMIN_EMAIL already exists; bootstrap will not modify it.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await UserModel.create({ name, email, passwordHash, role: 'ADMIN', active: true });
  console.log(`Bootstrap administrator created: ${email}`);
}

bootstrapAdmin()
  .catch((error: unknown) => {
    console.error('Failed to create bootstrap administrator:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect();
  });