import { getConnection, sql } from '../db';

export interface SeatTransaction {
    id: string; // UUID
    seat_id: string;
    user_id: string;
    action: string;
    ticket_id?: string | null;
    created_at?: Date;
}

// No Stored Procedures or Functions defined for SeatTransaction in the schema.

