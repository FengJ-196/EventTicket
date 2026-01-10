import { getConnection, sql } from '../db';

export interface Ticket {
    id: string; // UUID
    seat_id: string;
    payment_id: string;
    price: number;
    status: string;
}

export interface PurchasedTicket {
    payment_id: string;
    event_name: string;
    event_date: Date;
    seat_id: string;
    x_coordinate: number;
    y_coordinate: number;
    seat_type: string;
    price: number;
    seat_status: string;
    payment_date: Date;
}

// Uses Function: ViewPurchasedTickets
export const viewPurchasedTickets = async (userId: string): Promise<PurchasedTicket[]> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .query('SELECT * FROM ViewPurchasedTickets(@user_id)');
    return result.recordset as PurchasedTicket[];
    return result.recordset as PurchasedTicket[];
};

// Uses Stored Procedure: CancelTicket
export const refundTicket = async (ticketId: string, userId: string): Promise<boolean> => {
    const pool = await getConnection();
    try {
        await pool.request()
            .input('ticket_id', sql.UniqueIdentifier, ticketId)
            .input('user_id', sql.UniqueIdentifier, userId)
            .execute('CancelTicket');
        return true;
    } catch (error) {
        console.error('Refund ticket error:', error);
        throw error;
    }
};

