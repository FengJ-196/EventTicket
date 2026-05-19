import prisma from '../lib/prisma';
import { Payment } from '@prisma/client';

export const getPaymentById = async (id: string): Promise<Payment | null> => {
    return await prisma.payment.findUnique({
        where: { id }
    });
};

export const getPaymentsByUserId = async (userId: string): Promise<Payment[]> => {
    return await prisma.payment.findMany({
        where: { user_id: userId },
        orderBy: { payment_date: 'desc' }
    });
};

export const createPayment = async (paymentData: any): Promise<Payment> => {
    return await prisma.payment.create({
        data: {
            amount: paymentData.amount,
            payment_date: paymentData.payment_date || new Date(),
            method: paymentData.method,
            user_id: paymentData.user_id,
            status: paymentData.status || 'COMPLETED'
        }
    });
};

export const updatePaymentStatus = async (
    paymentId: string, 
    status: string, 
    externalReference?: string
): Promise<Payment | null> => {
    const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
            status,
            external_reference: externalReference
        }
    });

    if (payment && status === 'COMPLETED') {
        await prisma.ticket.updateMany({
            where: { payment_id: paymentId },
            data: { status: 'VALID' }
        });
    }

    return payment;
};

export const confirmPurchase = async (userId: string, seatIds: string[], paymentMethod: any, amount: number): Promise<void> => {
    await prisma.$transaction(async (tx) => {
        // 1. Create Payment
        const payment = await tx.payment.create({
            data: {
                amount,
                method: paymentMethod,
                user_id: userId,
                status: 'COMPLETED'
            }
        });

        // 2. Update Seats
        await tx.seat.updateMany({
            where: {
                id: { in: seatIds },
                user_id: userId
            },
            data: {
                status: 'BOOKED',
                hold_expires_at: null
            }
        });

        // 3. Create Tickets and log Transactions
        const seats = await tx.seat.findMany({
            where: { id: { in: seatIds } },
            include: { seatType: true }
        });

        for (const seat of seats) {
            const ticket = await tx.ticket.create({
                data: {
                    seat_id: seat.id,
                    payment_id: payment.id,
                    price: seat.seatType.price,
                    status: 'VALID'
                }
            });

            await tx.seatTransaction.create({
                data: {
                    seat_id: seat.id,
                    user_id: userId,
                    action: 'BOOK',
                    ticket_id: ticket.id
                }
            });
        }
    });
};

export const bookSeatsDirectly = async (userId: string, seatIds: string[]): Promise<string> => {
    return await prisma.$transaction(async (tx) => {
        const seats = await tx.seat.findMany({
            where: { id: { in: seatIds } },
            include: { seatType: true }
        });

        if (seats.length !== seatIds.length) throw new Error('Some seats not found');

        let totalAmount = 0;
        for (const seat of seats) {
            if (seat.status !== 'AVAILABLE') throw new Error(`Seat at position (${seat.x_coordinate}, ${seat.y_coordinate}) is not available`);
            totalAmount += parseFloat(seat.seatType.price.toString());
        }

        const payment = await tx.payment.create({
            data: {
                amount: totalAmount,
                method: 'CREDIT_CARD',
                user_id: userId,
                status: 'COMPLETED'
            }
        });

        await tx.seat.updateMany({
            where: { id: { in: seatIds } },
            data: {
                status: 'BOOKED',
                user_id: userId
            }
        });

        for (const seat of seats) {
            const ticket = await tx.ticket.create({
                data: {
                    seat_id: seat.id,
                    payment_id: payment.id,
                    price: seat.seatType.price,
                    status: 'VALID'
                }
            });

            await tx.seatTransaction.create({
                data: {
                    seat_id: seat.id,
                    user_id: userId,
                    action: 'BOOK',
                    ticket_id: ticket.id
                }
            });
        }

        return payment.id;
    });
};
