import { User, Event, Seat, SeatType, Ticket, Payment, SeatTransaction } from '@prisma/client';

export type DomainUser = User;
export type DomainEvent = Event;
export type DomainSeat = Seat;
export type DomainSeatType = SeatType;
export type DomainTicket = Ticket;
export type DomainPayment = Payment;
export type DomainSeatTransaction = SeatTransaction;

// Composite domain types for business logic
export interface EventWithCapacity extends DomainEvent {
    capacity: number;
}

export interface DetailedSeat extends DomainSeat {
    seatType: DomainSeatType;
}

export interface UserTicket extends DomainTicket {
    seat: DetailedSeat & { event: DomainEvent };
}
