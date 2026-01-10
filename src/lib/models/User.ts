import { getConnection, sql } from '../db';

export interface User {
    id: string; // UUID
    name: string;
    userName: string;
    role: 'USER' | 'ADMIN' | 'ORGANIZER';
    password?: string;
}

// No Stored Procedures or Functions defined for User in the schema.
