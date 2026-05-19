import prisma from '../lib/prisma';
import { Seat, SeatStatus } from '@prisma/client';

export const getSeatsByEventId = async (eventId: string): Promise<any[]> => {
    const seats = await prisma.seat.findMany({
        where: { event_id: eventId },
        include: {
            seatType: {
                select: { name: true, price: true }
            }
        },
        orderBy: [
            { y_coordinate: 'asc' },
            { x_coordinate: 'asc' }
        ]
    });

    return seats.map(seat => ({
        seat_id: seat.id,
        x_coordinate: seat.x_coordinate,
        y_coordinate: seat.y_coordinate,
        status: seat.status,
        seat_type: seat.seatType.name,
        price: Number(seat.seatType.price),
        user_id: seat.user_id || undefined,
        hold_expires_at: seat.hold_expires_at?.toISOString() || undefined
    }));
};

export const getSeatById = async (id: string): Promise<Seat | null> => {
    return await prisma.seat.findUnique({
        where: { id }
    });
};

export const createSeatsBulk = async (seats: any[]): Promise<void> => {
    if (seats.length === 0) return;
    await prisma.seat.createMany({
        data: seats.map(s => ({
            event_id: s.event_id,
            x_coordinate: s.x_coordinate,
            y_coordinate: s.y_coordinate,
            seat_type_id: s.seat_type_id,
            status: s.status || 'AVAILABLE'
        }))
    });
};

export const updateSeatStatus = async (id: string, status: SeatStatus, userId?: string | null): Promise<Seat | null> => {
    return await prisma.seat.update({
        where: { id },
        data: {
            status,
            user_id: userId
        }
    });
};

export const holdSeats = async (userId: string, seatIds: string[], holdSeconds: number = 600): Promise<string[]> => {
    const expiry = new Date(Date.now() + holdSeconds * 1000);
    const now = new Date();

    // Prisma doesn't have an easy way to do conditional batch updates with returns of FAILED items in one go
    // So we'll use a transaction
    return await prisma.$transaction(async (tx) => {
        // Validate user existence to prevent stale localStorage session from violating foreign key constraints
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const targetSeats = await tx.seat.findMany({
            where: {
                id: { in: seatIds },
                OR: [
                    { status: 'AVAILABLE' },
                    { 
                        status: 'ON_HOLD',
                        hold_expires_at: { lt: now }
                    }
                ]
            },
            select: { id: true }
        });

        const targetIds = targetSeats.map(s => s.id);
        
        await tx.seat.updateMany({
            where: {
                id: { in: targetIds }
            },
            data: {
                status: 'ON_HOLD',
                user_id: userId,
                hold_expires_at: expiry
            }
        });

        return seatIds.filter(id => !targetIds.includes(id));
    });
};

export const releaseExpiredHolds = async (): Promise<number> => {
    const res = await prisma.seat.updateMany({
        where: {
            status: 'ON_HOLD',
            hold_expires_at: { lt: new Date() }
        },
        data: {
            status: 'AVAILABLE',
            user_id: null,
            hold_expires_at: null
        }
    });
    return res.count;
};
