import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET() {
    try {
        const pool = await getConnection();
        // Fetch all PENDING events
        const result = await pool.request()
            .query(`
                SELECT * FROM Event 
                WHERE status = 'PENDING'
                ORDER BY event_date ASC
            `);
        return NextResponse.json(result.recordset);
    } catch (error) {
        console.error('Fetch admin events error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
