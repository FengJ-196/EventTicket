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
    const result = await pool.request().execute('GetAllEvents');
    return result.recordset as Event[];
};

export const getEventById = async (id: string): Promise<Event | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .execute('GetEventById');
    return (result.recordset[0] as Event) || null;
};

export const createEvent = async (event: Omit<Event, 'id' | 'status' | 'available_seats'>): Promise<Event> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('name', sql.NVarChar(200), event.name)
        .input('address', sql.NVarChar(255), event.address)
        .input('event_date', sql.DateTime, event.event_date)
        .input('rows', sql.Int, event.rows)
        .input('columns', sql.Int, event.columns)
        .input('organizer_id', sql.UniqueIdentifier, event.organizer_id)
        .execute('CreateEvent');

    return result.recordset[0] as Event;
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

    if (fields.name !== undefined) request.input('name', sql.NVarChar(200), fields.name);
    if (fields.status !== undefined) request.input('status', sql.NVarChar(50), fields.status);
    if (fields.address !== undefined) request.input('address', sql.NVarChar(255), fields.address);
    if (fields.event_date !== undefined) request.input('event_date', sql.DateTime, fields.event_date);
    if (fields.rows !== undefined) request.input('rows', sql.Int, fields.rows);
    if (fields.columns !== undefined) request.input('columns', sql.Int, fields.columns);

    const result = await request.execute('UpdateEvent');
    return (result.recordset[0] as Event) || null;
};

export const deleteEvent = async (id: string): Promise<boolean> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .execute('DeleteEvent');
    return result.rowsAffected[0] > 0;
};

export const searchEvents = async (keyword?: string, fromDate?: string, toDate?: string): Promise<Event[]> => {
    const pool = await getConnection();
    const request = pool.request();
    if (keyword) request.input('keyword', sql.NVarChar(200), keyword);
    if (fromDate) request.input('fromDate', sql.DateTime, new Date(fromDate));
    if (toDate) request.input('toDate', sql.DateTime, new Date(toDate));
    const result = await request.execute('SearchEvents');
    return result.recordset as Event[];
};

export const getEventDetails = async (id: string): Promise<any> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('eventId', sql.UniqueIdentifier, id)
        .execute('GetEventDetails');
    return result.recordset[0];
};
