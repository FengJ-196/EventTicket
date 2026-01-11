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
    const result = await pool.request().query('SELECT * FROM Seat');
    return result.recordset as Seat[];
};

export const getSeatById = async (id: string): Promise<Seat | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM Seat WHERE id = @id');
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
        .query(`
            DECLARE @InsertedSeat TABLE (id UNIQUEIDENTIFIER);
            
            INSERT INTO Seat (event_id, x_coordinate, y_coordinate, seat_type_id, user_id, status)
            OUTPUT INSERTED.id INTO @InsertedSeat
            VALUES (@event_id, @x_coordinate, @y_coordinate, @seat_type_id, @user_id, @status);
            
            SELECT s.* FROM Seat s JOIN @InsertedSeat i ON s.id = i.id;
        `);
    return result.recordset[0] as Seat;
};

export const updateSeat = async (id: string, fields: Partial<Omit<Seat, 'id'>>): Promise<Seat | null> => {
    const pool = await getConnection();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    const updates: string[] = [];

    if (fields.event_id !== undefined) { request.input('event_id', sql.UniqueIdentifier, fields.event_id); updates.push('event_id = @event_id'); }
    if (fields.x_coordinate !== undefined) { request.input('x_coordinate', sql.Int, fields.x_coordinate); updates.push('x_coordinate = @x_coordinate'); }
    if (fields.y_coordinate !== undefined) { request.input('y_coordinate', sql.Int, fields.y_coordinate); updates.push('y_coordinate = @y_coordinate'); }
    if (fields.seat_type_id !== undefined) { request.input('seat_type_id', sql.UniqueIdentifier, fields.seat_type_id); updates.push('seat_type_id = @seat_type_id'); }
    if (fields.user_id !== undefined) { request.input('user_id', sql.UniqueIdentifier, fields.user_id || null); updates.push('user_id = @user_id'); }
    if (fields.status !== undefined) { request.input('status', sql.NVarChar(50), fields.status); updates.push('status = @status'); }

    if (updates.length === 0) return getSeatById(id);

    const query = `
        UPDATE Seat
        SET ${updates.join(', ')}
        WHERE id = @id;
        
        SELECT * FROM Seat WHERE id = @id;
    `;

    const result = await request.query(query);
    return (result.recordset[0] as Seat) || null;
};

export const getSeatsByEventId = async (eventId: string): Promise<Seat[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('eventId', sql.UniqueIdentifier, eventId)
        .query('SELECT * FROM Seat WHERE event_id = @eventId');
    return result.recordset as Seat[];
};

// Uses Stored Procedure: HoldSeats
export const holdSeats = async (userId: string, seatIds: string[], holdMinutes: number = 10): Promise<void> => {
    const pool = await getConnection();

    // Helper to create TVP
    const tvp = new sql.Table();
    // Use 'dbo.GuidList' if that type needs to be specified, but typically simple table structure works if matching the TVP definition
    // Defining columns to match the EXPECTED structure of GuidList. 
    // Usually GuidList is defined as TABLE(id UNIQUEIDENTIFIER).
    tvp.columns.add('id', sql.UniqueIdentifier);

    for (const id of seatIds) {
        tvp.rows.add(id);
    }

    await pool.request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('seat_ids', tvp)
        .input('hold_minutes', sql.Int, holdMinutes)
        .execute('HoldSeats');
};

// Uses Stored Procedure: ReleaseExpiredHolds
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
