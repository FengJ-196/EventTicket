import { NextResponse } from 'next/server';
import { getSeatTypesByEventId, createSeatType } from '@/lib/models/SeatType';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const eventId = params.id;
        if (!eventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });

        const seatTypes = await getSeatTypesByEventId(eventId);
        return NextResponse.json(seatTypes);
    } catch (error: any) {
        console.error('Get seat types error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const eventId = params.id;
        if (!eventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });

        const body = await req.json();
        const { name, price } = body;

        if (!name || price === undefined) {
            return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
        }

        const newSeatType = await createSeatType({
            event_id: eventId,
            name,
            price
        });

        return NextResponse.json(newSeatType);
    } catch (error: any) {
        console.error('Create seat type error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
