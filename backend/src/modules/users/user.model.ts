import mongoose, { HydratedDocument, Schema, model } from 'mongoose';

export const userRoles = ['ADMIN', 'RECEPCION', 'PROFESIONAL'] as const;
export type UserRole = (typeof userRoles)[number];

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  specialty?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: userRoles, required: true },
    active: { type: Boolean, default: true, required: true },
    phone: { type: String, trim: true, maxlength: 40 },
    specialty: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = mongoose.models.User || model<User>('User', userSchema);

export function toPublicUser(user: UserDocument) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    phone: user.phone,
    specialty: user.specialty,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}