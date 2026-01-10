import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, userName, password } = body;

        if (!name || !userName || !password) {
            return NextResponse.json({ error: 'Name, Username, and Password are required' }, { status: 400 });
        }

        const pool = await getConnection();

        const result = await pool.request()
            .input('name', sql.NVarChar(100), name)
            .input('userName', sql.NVarChar(100), userName)
            .input('password', sql.NVarChar(100), password)
            .execute('RegisterUser');

        const user = result.recordset[0];

        return NextResponse.json({ success: true, user });

    } catch (error: any) {
        console.error('Registration error:', error);
        if (error.number === 50001) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
