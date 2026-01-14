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
export const getSeatTransactions = async (): Promise<DetailedSeatTransaction[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .query('SELECT * FROM GetSeatTransactions() ORDER BY created_at DESC');
    return result.recordset as DetailedSeatTransaction[];
};
