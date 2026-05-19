import prisma from '../lib/prisma';
import { Ticket } from '@prisma/client';

export const getTicketsByUserId = async (userId: string): Promise<any[]> => {
    return await prisma.ticket.findMany({
        where: {
            payment: {
                user_id: userId
            }
        },
        include: {
            seat: {
                include: {
                    event: true,
                    seatType: true
                }
            }
        }
    });
};

export const createTicketsBulk = async (tickets: any[]): Promise<void> => {
    if (tickets.length === 0) return;
    await prisma.ticket.createMany({
        data: tickets.map(t => ({
            seat_id: t.seat_id,
            payment_id: t.payment_id,
            price: t.price,
            status: t.status || 'VALID'
        }))
    });
};

export const refundTicket = async (ticketId: string, userId: string): Promise<boolean> => {
    try {
        await prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findFirst({
                where: {
                    id: ticketId,
                    status: 'VALID',
                    payment: {
                        user_id: userId
                    }
                },
                include: {
                    seat: true
                }
            });

            if (!ticket) throw new Error('Invalid ticket');

            await tx.ticket.update({
                where: { id: ticketId },
                data: { status: 'REFUNDED' }
            });

            await tx.seat.update({
                where: { id: ticket.seat_id },
                data: {
                    status: 'AVAILABLE',
                    user_id: null,
                    hold_expires_at: null
                }
            });
        });
        return true;
    } catch {
        return false;
    }
};

export const validateTicket = async (ticketId: string): Promise<Ticket | null> => {
    return await prisma.ticket.update({
        where: {
            id: ticketId,
            status: 'VALID'
        },
        data: {
            status: 'SCANNED'
        }
    });
};
