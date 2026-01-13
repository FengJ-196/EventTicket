import { getConnection, sql } from '../db';

export interface Seat {
    id: string; // UUID
    event_id: string;
    x_coordinate: number;
    y_coordinate: number;
    seat_type_id: string;
    user_id?: string | null;
    status: string;
}

export const getAllSeats = async (): Promise<Seat[]> => {
    const pool = await getConnection();
    const result = await pool.request().execute('GetAllSeats');
    return result.recordset as Seat[];
};

export const getSeatById = async (id: string): Promise<Seat | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .execute('GetSeatById');
    return (result.recordset[0] as Seat) || null;
};

export const createSeat = async (seat: Omit<Seat, 'id'>): Promise<Seat> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('event_id', sql.UniqueIdentifier, seat.event_id)
        .input('x_coordinate', sql.Int, seat.x_coordinate)
        .input('y_coordinate', sql.Int, seat.y_coordinate)
        .input('seat_type_id', sql.UniqueIdentifier, seat.seat_type_id)
        .input('user_id', sql.UniqueIdentifier, seat.user_id || null)
        .input('status', sql.NVarChar(50), seat.status)
        .execute('CreateSeat');
    return result.recordset[0] as Seat;
};

export const updateSeat = async (id: string, fields: Partial<Omit<Seat, 'id'>>): Promise<Seat | null> => {
    const pool = await getConnection();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (fields.seat_type_id !== undefined) request.input('seat_type_id', sql.UniqueIdentifier, fields.seat_type_id);
    if (fields.user_id !== undefined) request.input('user_id', sql.UniqueIdentifier, fields.user_id || null);
    if (fields.status !== undefined) request.input('status', sql.NVarChar(50), fields.status);

    const result = await request.execute('UpdateSeat');
    return (result.recordset[0] as Seat) || null;
};

export const getSeatsByEventId = async (eventId: string): Promise<Seat[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('event_id', sql.UniqueIdentifier, eventId)
        .execute('GetSeatsByEventId');
    return result.recordset as Seat[];
};

export const holdSeats = async (userId: string, seatIds: string[], holdSeconds: number = 600): Promise<string[]> => {
    const pool = await getConnection();
    const tvp = new sql.Table();
    tvp.columns.add('id', sql.UniqueIdentifier);
    for (const id of seatIds) tvp.rows.add(id);

    const result = await pool.request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('seat_ids', tvp)
        .input('hold_seconds', sql.Int, holdSeconds)
        .execute('HoldSeats');

    if (result.recordset && result.recordset.length > 0) {
        return result.recordset.map((row: any) => row.id);
    }
    return [];
};

export const releaseExpiredHolds = async (): Promise<void> => {
    const pool = await getConnection();
    await pool.request().execute('ReleaseExpiredHolds');
};

export const disableSeats = async (eventId: string, seatIds: string[]): Promise<void> => {
    const pool = await getConnection();
    const tvp = new sql.Table();
    tvp.columns.add('id', sql.UniqueIdentifier);
    for (const id of seatIds) tvp.rows.add(id);

    await pool.request()
        .input('event_id', sql.UniqueIdentifier, eventId)
        .input('seat_ids', tvp)
        .execute('DisableSeats');
};

export const enableSeats = async (eventId: string, seatIds: string[]): Promise<void> => {
    const pool = await getConnection();
    const tvp = new sql.Table();
    tvp.columns.add('id', sql.UniqueIdentifier);
    for (const id of seatIds) tvp.rows.add(id);

    await pool.request()
        .input('event_id', sql.UniqueIdentifier, eventId)
        .input('seat_ids', tvp)
        .execute('EnableSeats');
};
