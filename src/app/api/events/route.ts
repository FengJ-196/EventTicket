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
        let body = await req.json();

        // Handle array payload (common in data import/export)
        if (Array.isArray(body)) {
            body = body[0];
        }

        let { name, address, event_date, rows, columns, organizer_id, status, capacity, available_seats } = body;

        // Infer rows/columns if missing but capacity exists (assume square layout)
        if (!rows && !columns && capacity) {
            rows = Math.floor(Math.sqrt(capacity));
            columns = Math.ceil(capacity / rows);
        }

        // Validate basic requirements
        if (!name || !address || !event_date || !organizer_id) {
            return NextResponse.json({ error: 'Missing required fields (name, address, event_date, organizer_id)' }, { status: 400 });
        }

        // Default rows/columns if still missing
        if (!rows) rows = 10;
        if (!columns) columns = 10;

        const pool = await getConnection();

        const result = await pool.request()
            .input('name', sql.NVarChar(200), name)
            .input('status', sql.NVarChar(50), status || 'DRAFT')
            .input('address', sql.NVarChar(255), address)
            .input('event_date', sql.DateTime, new Date(event_date))
            .input('rows', sql.Int, rows)
            .input('columns', sql.Int, columns)
            .input('available_seats', sql.Int, available_seats ?? 0)
            .input('organizer_id', sql.UniqueIdentifier, organizer_id)
            .query(`
                DECLARE @InsertedEvent TABLE (id UNIQUEIDENTIFIER);

                INSERT INTO Event (name, status, address, event_date, rows, columns, available_seats, organizer_id)
                OUTPUT INSERTED.id INTO @InsertedEvent
                VALUES (@name, @status, @address, @event_date, @rows, @columns, @available_seats, @organizer_id);

                SELECT * FROM Event WHERE id = (SELECT id FROM @InsertedEvent);
            `);

        const newEvent = result.recordset[0];

        return NextResponse.json({
            id: newEvent.id,
            message: `Event created in ${newEvent.status} state`,
            event: newEvent
        });

    } catch (error: any) {
        console.error('Create event error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
