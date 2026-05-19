import { z } from 'zod';

export const EventStatus = z.enum(['DRAFT', 'PENDING', 'VERIFY', 'PUBLISHED', 'CANCELLED']);

export const EventSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(200),
  status: EventStatus.default('DRAFT'),
  address: z.string().max(255).optional().nullable(),
  event_date: z.coerce.date(),
  rows: z.number().int().min(1).max(100).optional().nullable(),
  columns: z.number().int().min(1).max(100).optional().nullable(),
  available_seats: z.number().int().min(0).default(0),
  organizer_id: z.string().uuid(),
});

export const CreateEventSchema = EventSchema.omit({ 
  id: true, 
  status: true, 
  available_seats: true 
});

export const UpdateEventSchema = EventSchema.partial().omit({ 
  id: true, 
  organizer_id: true 
});

export const SearchEventSchema = z.object({
  keyword: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

// DTOs
export type EventDTO = z.infer<typeof EventSchema>;
export type CreateEventDTO = z.infer<typeof CreateEventSchema>;
export type UpdateEventDTO = z.infer<typeof UpdateEventSchema>;
export type SearchEventDTO = z.infer<typeof SearchEventSchema>;
