import prisma from '../lib/prisma';
import { Event } from '@prisma/client';

export const searchEvents = async (keyword?: string, fromDate?: Date, toDate?: Date): Promise<any[]> => {
    return await prisma.event.findMany({
        where: {
            status: 'PUBLISHED',
            event_date: {
                gte: fromDate || new Date(),
                lte: toDate
            },
            OR: keyword ? [
                { name: { contains: keyword, mode: 'insensitive' } },
                { address: { contains: keyword, mode: 'insensitive' } }
            ] : undefined
        },
        orderBy: { event_date: 'asc' }
    });
};

export const getEventById = async (id: string): Promise<any | null> => {
    return await prisma.event.findUnique({
        where: { id },
        include: {
            organizer: {
                select: { name: true }
            }
        }
    });
};

export const getEventsByOrganizerId = async (organizerId: string): Promise<Event[]> => {
    return await prisma.event.findMany({
        where: { organizer_id: organizerId },
        orderBy: { event_date: 'desc' }
    });
};

export const getPendingEvents = async (): Promise<Event[]> => {
    return await prisma.event.findMany({
        where: { status: 'PENDING' },
        orderBy: { event_date: 'asc' }
    });
};

export const createEvent = async (eventData: any): Promise<Event> => {
    return await prisma.event.create({
        data: {
            name: eventData.name,
            status: eventData.status || 'DRAFT',
            address: eventData.address,
            event_date: eventData.event_date,
            rows: eventData.rows,
            columns: eventData.columns,
            available_seats: eventData.available_seats || 0,
            organizer_id: eventData.organizer_id
        }
    });
};

export const updateEvent = async (id: string, fields: any): Promise<Event | null> => {
    return await prisma.event.update({
        where: { id },
        data: fields
    });
};
