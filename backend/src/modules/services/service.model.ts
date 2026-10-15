import mongoose, { HydratedDocument, Schema, model } from 'mongoose';

export const serviceCategories = [
  'Psicología',
  'Estimulación Auditiva',
  'Lenguaje',
  'Evaluación Integral',
] as const;

export type ServiceCategory = (typeof serviceCategories)[number];
export type ServiceStatus = 'ACTIVO' | 'INACTIVO';

export interface ClinicalService {
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioCentavos: number;
  imagenUrl?: string;
  estado: ServiceStatus;
  categoria: ServiceCategory;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ClinicalServiceDocument = HydratedDocument<ClinicalService>;

const clinicalServiceSchema = new Schema<ClinicalService>(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, required: true, trim: true, maxlength: 2000 },
    duracionMinutos: { type: Number, required: true, min: 15, max: 480 },
    precioCentavos: { type: Number, required: true, min: 1, max: 100_000_000, validate: Number.isSafeInteger },
    imagenUrl: { type: String, trim: true, maxlength: 2048 },
    estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO', required: true },
    categoria: { type: String, enum: serviceCategories, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const ClinicalServiceModel = mongoose.models.ClinicalService ||
  model<ClinicalService>('ClinicalService', clinicalServiceSchema);

export function toPublicService(service: ClinicalServiceDocument) {
  return {
    id: service.id,
    nombre: service.nombre,
    descripcion: service.descripcion,
    duracionMinutos: service.duracionMinutos,
    precioCentavos: service.precioCentavos,
    precioQ: Number((service.precioCentavos / 100).toFixed(2)),
    imagenUrl: service.imagenUrl ?? '',
    estado: service.estado,
    categoria: service.categoria,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}