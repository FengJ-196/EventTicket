import { z } from 'zod';

// Domain Enums (Mirroring Prisma)
export const Role = z.enum(['USER', 'ADMIN', 'ORGANIZER']);

// Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  userName: z.string().min(3).max(100),
  password: z.string().min(6).max(255),
  role: Role.default('USER'),
});

export const LoginSchema = z.object({
  userName: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  userName: z.string().min(3, 'Username is too short'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// DTOs
export type UserDTO = z.infer<typeof UserSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type UserResponseDTO = Omit<UserDTO, 'password'>;
