import { getConnection, sql } from '../db';

export const viewPurchasedTickets = async (userId: string): Promise<PurchasedTicket[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .query('SELECT * FROM ViewPurchasedTickets(@user_id)');
    return result.recordset as PurchasedTicket[];
};

export const refundTicket = async (ticketId: string, userId: string): Promise<boolean> => {
    const pool = await getConnection();
    await pool.request()
        .input('ticket_id', sql.UniqueIdentifier, ticketId)
        .input('user_id', sql.UniqueIdentifier, userId)
        .execute('CancelTicket');
    return true;
};
