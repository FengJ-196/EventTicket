import { getConnection, sql } from '../db';

export interface User {
    id: string; // UUID
    name: string;
    userName: string;
    role: 'USER' | 'ADMIN' | 'ORGANIZER';
    password?: string;
}

export const register = async (name: string, userName: string, password: string): Promise<User> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('name', sql.NVarChar(100), name)
        .input('userName', sql.NVarChar(100), userName)
        .input('password', sql.NVarChar(100), password)
        .execute('RegisterUser');
    return result.recordset[0] as User;
};

export const login = async (userName: string, password: string): Promise<User | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('userName', sql.NVarChar(100), userName)
        .input('password', sql.NVarChar(100), password)
        .execute('LoginUser');
    return (result.recordset[0] as User) || null;
};
