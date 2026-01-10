import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const organizerId = searchParams.get('organizerId');

    if (!organizerId) {
        return NextResponse.json({ error: 'Organizer ID is required' }, { status: 400 });
    }

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('organizer_id', sql.UniqueIdentifier, organizerId)
            .query('SELECT * FROM Event WHERE organizer_id = @organizer_id ORDER BY event_date DESC');

        return NextResponse.json(result.recordset);
    } catch (error) {
        console.error('Fetch organizer events error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
