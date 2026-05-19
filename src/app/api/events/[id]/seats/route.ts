import { NextResponse } from 'next/server';
import { getSeatsByEventId, releaseExpiredHolds } from '@/data-access/Seat';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const eventId = params.id;
        if (!eventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });

        // Ensure expired holds are released before fetching
        await releaseExpiredHolds();

        const seats = await getSeatsByEventId(eventId);
        return NextResponse.json(seats);
    } catch (error: any) {
        console.error('Get seats error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
