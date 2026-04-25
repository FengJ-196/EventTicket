import { getConnection, sql } from '../db';

export const getSeatTransactions = async (): Promise<DetailedSeatTransaction[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .query('SELECT * FROM GetSeatTransactions() ORDER BY created_at DESC');
    return result.recordset as DetailedSeatTransaction[];
};
