import { z } from 'zod';

export const SeatStatus = z.enum(['AVAILABLE', 'BOOKED', 'ON_HOLD']);
export const PaymentMethod = z.enum(['CREDIT_CARD', 'CASH', 'BANK_TRANSFER', 'E_WALLET']);

export const HoldSeatsSchema = z.object({
  userId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1, 'At least one seat must be selected'),
  holdSeconds: z.number().int().min(30).max(3600).default(600),
});

export const ConfirmPurchaseSchema = z.object({
  userId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1),
  paymentMethod: PaymentMethod,
  amount: z.number().positive(),
});

export const RefundTicketSchema = z.object({
  ticketId: z.string().uuid(),
  userId: z.string().uuid(),
});

// DTOs
export type HoldSeatsDTO = z.infer<typeof HoldSeatsSchema>;
export type ConfirmPurchaseDTO = z.infer<typeof ConfirmPurchaseSchema>;
export type RefundTicketDTO = z.infer<typeof RefundTicketSchema>;
