import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const keyword = searchParams.get('keyword');
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');

        const pool = await getConnection();
        const request = pool.request();

        if (keyword) request.input('keyword', sql.NVarChar(200), keyword);
        if (fromDate) request.input('fromDate', sql.DateTime, new Date(fromDate));
        if (toDate) request.input('toDate', sql.DateTime, new Date(toDate));

        const result = await request.execute('SearchEvents');

        return NextResponse.json(result.recordset);

    } catch (error: any) {
        console.error('Search events error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, address, event_date, rows, columns, organizer_id } = body;

        if (!name || !address || !event_date || !rows || !columns || !organizer_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const pool = await getConnection();

        // Calculate initial capacity (though DB sets available_seats to 0 for DRAFT)
        const capacity = rows * columns;

        const result = await pool.request()
            .input('name', sql.NVarChar(200), name)
            .input('status', sql.NVarChar(50), 'DRAFT')
            .input('address', sql.NVarChar(255), address)
            .input('event_date', sql.DateTime, new Date(event_date))
            .input('rows', sql.Int, rows)
            .input('columns', sql.Int, columns)
            .input('available_seats', sql.Int, 0) // Initially 0 until VERIFY
            .input('organizer_id', sql.UniqueIdentifier, organizer_id)
            .query(`
                INSERT INTO Event (name, status, address, event_date, rows, columns, available_seats, organizer_id)
                OUTPUT INSERTED.id
                VALUES (@name, @status, @address, @event_date, @rows, @columns, @available_seats, @organizer_id)
            `);

        const newEventId = result.recordset[0].id;

        return NextResponse.json({ id: newEventId, message: 'Event created in DRAFT state' });

    } catch (error: any) {
        console.error('Create event error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
