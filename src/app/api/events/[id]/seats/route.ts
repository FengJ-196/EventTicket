import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = params.id;
        const pool = await getConnection();

        // Call the table-valued function
        const result = await pool.request()
            .input('EventId', sql.UniqueIdentifier, id)
            .query('SELECT * FROM GetEventSeatMap(@EventId)');

        return NextResponse.json(result.recordset);

    } catch (error: any) {
        console.error('Get seat map error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
