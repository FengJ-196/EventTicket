import { getConnection, sql } from '../db';

export interface SeatType {
    id: string; // UUID
    name: string;
    price: number;
    event_id: string;
}

export const getAllSeatTypes = async (): Promise<SeatType[]> => {
    const pool = await getConnection();
    const result = await pool.request().execute('GetAllSeatTypes');
    return result.recordset as SeatType[];
};

export const getSeatTypeById = async (id: string): Promise<SeatType | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .execute('GetSeatTypeById');
    return (result.recordset[0] as SeatType) || null;
};

export const createSeatType = async (seatType: Omit<SeatType, 'id'>): Promise<SeatType> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('event_id', sql.UniqueIdentifier, seatType.event_id)
        .input('name', sql.NVarChar(100), seatType.name)
        .input('price', sql.Decimal(10, 2), seatType.price)
        .execute('CreateSeatType');

    return result.recordset[0] as SeatType;
};

export const updateSeatType = async (id: string, fields: Partial<Omit<SeatType, 'id'>>): Promise<SeatType | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('name', sql.NVarChar(100), fields.name || null)
        .input('price', sql.Decimal(10, 2), fields.price || null)
        .execute('UpdateSeatType');

    return (result.recordset[0] as SeatType) || null;
};

export const deleteSeatType = async (id: string): Promise<boolean> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .execute('DeleteSeatType');
    return result.rowsAffected[0] > 0;
};

export const getSeatTypesByEventId = async (eventId: string): Promise<SeatType[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('event_id', sql.UniqueIdentifier, eventId)
        .execute('GetSeatTypesByEventId');
    return result.recordset as SeatType[];
};

export const assignSeatTypeByRectangle = async (
    eventId: string,
    seatTypeName: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
): Promise<void> => {
    const pool = await getConnection();
    await pool.request()
        .input('event_id', sql.UniqueIdentifier, eventId)
        .input('seat_type_name', sql.NVarChar(100), seatTypeName)
        .input('x1', sql.Int, x1)
        .input('y1', sql.Int, y1)
        .input('x2', sql.Int, x2)
        .input('y2', sql.Int, y2)
        .execute('AssignSeatTypeByRectangle');
};
