import { NextResponse } from 'next/server';
import { searchEvents, createEvent } from '@/data-access/Event';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const keyword = searchParams.get('keyword') || undefined;
        const fromDateStr = searchParams.get('fromDate');
        const toDateStr = searchParams.get('toDate');

        const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
        const toDate = toDateStr ? new Date(toDateStr) : undefined;

        const events = await searchEvents(keyword, fromDate, toDate);

        return NextResponse.json(events);

    } catch (error: any) {
        console.error('Search events error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        let body = await req.json();

        if (Array.isArray(body)) {
            body = body[0];
        }

        const { name, address, event_date, rows, columns, organizer_id, status, capacity, available_seats } = body;

        if (!name || !address || !event_date || !organizer_id) {
            return NextResponse.json({ error: 'Missing required fields (name, address, event_date, organizer_id)' }, { status: 400 });
        }

        const newEvent = await createEvent({
            name,
            address,
            event_date: new Date(event_date),
            rows: rows || (capacity ? Math.floor(Math.sqrt(capacity)) : 10),
            columns: columns || (capacity ? Math.ceil(capacity / Math.floor(Math.sqrt(capacity))) : 10),
            organizer_id,
            status: status || 'DRAFT',
            available_seats: available_seats || 0
        });

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
