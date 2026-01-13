import { getConnection, sql } from '../db';

export interface Event {
    id: string; // UUID
    name: string;
    status: string;
    address?: string;
    event_date: Date;
    capacity?: number;
    rows?: number;
    columns?: number;
    available_seats?: number;
    organizer_id: string;
}

export interface EventSeatMapItem {
    id: string;
    seat_id: string;
    x_coordinate: number;
    y_coordinate: number;
    status: string;
    user_id?: string;
    hold_expires_at?: Date;
    seat_type_id: string;
    seat_type: string;
    price: number;
}


export const getAllEvents = async (): Promise<Event[]> => {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Event');
    return result.recordset as Event[];
};

export const getEventById = async (id: string): Promise<Event | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM Event WHERE id = @id');
    return (result.recordset[0] as Event) || null;
};

// Uses Stored Procedure: CreateEvent
export const createEvent = async (event: Omit<Event, 'id' | 'status' | 'available_seats'>): Promise<Event> => {
    const pool = await getConnection();

    await pool.request()
        .input('name', sql.NVarChar(200), event.name)
        .input('address', sql.NVarChar(255), event.address)
        .input('event_date', sql.DateTime, event.event_date)
        .input('rows', sql.Int, event.rows)
        .input('columns', sql.Int, event.columns)
        .input('organizer_id', sql.UniqueIdentifier, event.organizer_id)
        .execute('CreateEvent');

    return {} as Event;
};

export const getUpcomingEvents = async (): Promise<Event[]> => {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM GetUpcomingEvents()');
    return result.recordset as Event[];
};

export const getEventSeatMap = async (eventId: string): Promise<EventSeatMapItem[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('EventId', sql.UniqueIdentifier, eventId)
        .query('SELECT * FROM GetEventSeatMap(@EventId)');
    return result.recordset as EventSeatMapItem[];
};

export const updateEvent = async (id: string, fields: Partial<Omit<Event, 'id'>>): Promise<Event | null> => {
    const pool = await getConnection();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    const updates: string[] = [];

    if (fields.name !== undefined) { request.input('name', sql.NVarChar(200), fields.name); updates.push('name = @name'); }
    if (fields.status !== undefined) { request.input('status', sql.NVarChar(50), fields.status); updates.push('status = @status'); }
    if (fields.address !== undefined) { request.input('address', sql.NVarChar(255), fields.address); updates.push('address = @address'); }
    if (fields.event_date !== undefined) { request.input('event_date', sql.DateTime, fields.event_date); updates.push('event_date = @event_date'); }
    if (fields.rows !== undefined) { request.input('rows', sql.Int, fields.rows); updates.push('rows = @rows'); }
    if (fields.columns !== undefined) { request.input('columns', sql.Int, fields.columns); updates.push('columns = @columns'); }
    if (fields.available_seats !== undefined) { request.input('available_seats', sql.Int, fields.available_seats); updates.push('available_seats = @available_seats'); }

    if (updates.length === 0) return getEventById(id);

    const query = `
        SET NOCOUNT ON;
        UPDATE Event
        SET ${updates.join(', ')}
        WHERE id = @id;

        SELECT * FROM Event WHERE id = @id;
    `;

    const result = await request.query(query);

    // Find the recordset that has our data (in case triggers produced others)
    const recordsets = (result as any).recordsets as any[][];
    const recordset = recordsets.find(rs => rs && rs.length > 0);
    return (recordset?.[0] as Event) || null;
};

export const deleteEvent = async (id: string): Promise<boolean> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM Event WHERE id = @id');
    return result.rowsAffected[0] > 0;
};

export const createEventRaw = async (event: Omit<Event, 'id'>): Promise<Event> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('name', sql.NVarChar(200), event.name)
        .input('status', sql.NVarChar(50), event.status)
        .input('address', sql.NVarChar(255), event.address)
        .input('event_date', sql.DateTime, event.event_date)
        .input('rows', sql.Int, event.rows)
        .input('columns', sql.Int, event.columns)
        .input('available_seats', sql.Int, event.available_seats)
        .input('organizer_id', sql.UniqueIdentifier, event.organizer_id)
        .query(`
            DECLARE @InsertedEvent TABLE (id UNIQUEIDENTIFIER);

            INSERT INTO Event (name, status, address, event_date, rows, columns, available_seats, organizer_id)
            OUTPUT INSERTED.id INTO @InsertedEvent
            VALUES (@name, @status, @address, @event_date, @rows, @columns, @available_seats, @organizer_id);

            SELECT * FROM Event WHERE id = (SELECT id FROM @InsertedEvent);
        `);
    return result.recordset[0] as Event;
};


export const createEventWithSeats = async (
    organizerId: string,
    eventName: string,
    address: string,
    eventDate: Date,
    rows: number,
    columns: number
): Promise<string> => {
    const capacity = rows * columns;
    const newEvent = await createEventRaw({
        name: eventName,
        status: 'DRAFT',
        address,
        event_date: eventDate,
        rows,
        columns,
        capacity,
        available_seats: capacity,
        organizer_id: organizerId
    });

    if (!newEvent || !newEvent.id) {
        throw new Error('Failed to create event');
    }

    await updateEvent(newEvent.id, { status: 'VERIFY' });

    return newEvent.id;
};
