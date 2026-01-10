import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userName, password } = body;

        if (!userName || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const pool = await getConnection();

        const result = await pool.request()
            .input('userName', sql.NVarChar(100), userName)
            .input('password', sql.NVarChar(100), password)
            .execute('LoginUser');

        const user = result.recordset[0];

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        return NextResponse.json({ success: true, user });

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
