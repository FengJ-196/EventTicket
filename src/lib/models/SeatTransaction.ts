import { getConnection, sql } from '../db';

export interface SeatTransaction {
    id: string; // UUID
    seat_id: string;
    user_id: string;
    action: string;
    ticket_id?: string | null;
    created_at?: Date;
}

export interface DetailedSeatTransaction {
    id: string;
    action: string;
    created_at: Date;
    user_name: string;
    user_username: string;
    event_name: string;
    x_coordinate: number;
    y_coordinate: number;
    ticket_id?: string | null;
}
<<<<<<< HEAD
=======

export const getSeatTransactions = async (): Promise<DetailedSeatTransaction[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .query('SELECT * FROM GetSeatTransactions() ORDER BY created_at DESC');
    return result.recordset as DetailedSeatTransaction[];
};

// No Stored Procedures or Functions defined for SeatTransaction in the schema.
>>>>>>> 81104ae306c87af5be1a5e2721fe90bd754be3b7

export const getSeatTransactions = async (): Promise<DetailedSeatTransaction[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .query('SELECT * FROM GetSeatTransactions() ORDER BY created_at DESC');
    return result.recordset as DetailedSeatTransaction[];
};
