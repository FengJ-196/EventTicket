import prisma from '../lib/prisma';
import { SeatType } from '@prisma/client';

export const getAllSeatTypes = async (): Promise<SeatType[]> => {
    return await prisma.seatType.findMany();
};

export const getSeatTypeById = async (id: string): Promise<SeatType | null> => {
    return await prisma.seatType.findUnique({
        where: { id }
    });
};

export const createSeatType = async (seatType: any): Promise<SeatType> => {
    return await prisma.seatType.create({
        data: {
            event_id: seatType.event_id,
            name: seatType.name,
            price: seatType.price
        }
    });
};

export const updateSeatType = async (id: string, fields: any): Promise<SeatType | null> => {
    return await prisma.seatType.update({
        where: { id },
        data: fields
    });
};

export const deleteSeatType = async (id: string): Promise<boolean> => {
    try {
        await prisma.seatType.delete({
            where: { id }
        });
        return true;
    } catch {
        return false;
    }
};

export const getSeatTypesByEventId = async (eventId: string): Promise<SeatType[]> => {
    return await prisma.seatType.findMany({
        where: { event_id: eventId }
    });
};

export const assignSeatTypeByRectangle = async (
    eventId: string,
    seatTypeName: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
): Promise<void> => {
    const seatType = await prisma.seatType.findFirst({
        where: {
            event_id: eventId,
            name: seatTypeName
        }
    });

    if (!seatType) throw new Error('Seat type not found');

    await prisma.seat.updateMany({
        where: {
            event_id: eventId,
            status: 'AVAILABLE',
            x_coordinate: { gte: x1, lte: x2 },
            y_coordinate: { gte: y1, lte: y2 }
        },
        data: {
            seat_type_id: seatType.id
        }
    });
};
