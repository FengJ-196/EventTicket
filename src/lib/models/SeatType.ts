import { getConnection, sql } from '../db';

export interface SeatType {
    id: string; // UUID
    name: string;
    price: number;
    event_id: string;
}

export const getAllSeatTypes = async (): Promise<SeatType[]> => {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM SeatType');
    return result.recordset as SeatType[];
};

export const getSeatTypeById = async (id: string): Promise<SeatType | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM SeatType WHERE id = @id');
    return (result.recordset[0] as SeatType) || null;
};

// Uses Stored Procedure: CreateSeatType
export const createSeatType = async (seatType: Omit<SeatType, 'id'>): Promise<SeatType> => {
    const pool = await getConnection();
    // Procedure CreateSeatType @event_id, @name, @price
    // It selects @seat_type_id at the end.
    const result = await pool.request()
        .input('event_id', sql.UniqueIdentifier, seatType.event_id)
        .input('name', sql.NVarChar(100), seatType.name)
        .input('price', sql.Decimal(10, 2), seatType.price)
        .execute('CreateSeatType');

    // The SP returns a result set with seat_type_id
    const newId = result.recordset[0].seat_type_id;

    // Fetch and return the full object
    return (await getSeatTypeById(newId)) as SeatType;
};

// Uses Stored Procedure: UpdateSeatType
export const updateSeatType = async (id: string, fields: Partial<Omit<SeatType, 'id'>>): Promise<SeatType | null> => {
    const pool = await getConnection();

    // SP: UpdateSeatType @seat_type_id, @event_id, @name, @price
    // Note: SP requires event_id for validation: "IF NOT EXISTS (SELECT 1 FROM SeatType WHERE id = @seat_type_id AND event_id = @event_id)"
    // This is slightly tricky if we don't have event_id in 'fields'.
    // We might need to fetch the existing seatType first to get event_id if not provided.

    let eventId = fields.event_id;
    if (!eventId) {
        const existing = await getSeatTypeById(id);
        if (!existing) return null;
        eventId = existing.event_id;
    }

    await pool.request()
        .input('seat_type_id', sql.UniqueIdentifier, id)
        .input('event_id', sql.UniqueIdentifier, eventId)
        .input('name', sql.NVarChar(100), fields.name || null) // Pass null if undefined to let SP handle COALESCE handling if logic matches, but SP default params = NULL? 
        // SP def: @name NVARCHAR(100) = NULL. So passing null is fine.
        .input('price', sql.Decimal(10, 2), fields.price || null)
        .execute('UpdateSeatType');

    return getSeatTypeById(id);
};

export const deleteSeatType = async (id: string): Promise<boolean> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM SeatType WHERE id = @id');
    return result.rowsAffected[0] > 0;
};

export const getSeatTypesByEventId = async (eventId: string): Promise<SeatType[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('eventId', sql.UniqueIdentifier, eventId)
        .query('SELECT * FROM SeatType WHERE event_id = @eventId');
    return result.recordset as SeatType[];
};

// Uses Stored Procedure: AssignSeatTypeByRectangle
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


