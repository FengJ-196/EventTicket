import { NextResponse } from 'next/server';
import { getEventsByOrganizerId } from '@/data-access/Event';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const organizerId = searchParams.get('organizerId');

    if (!organizerId) {
        return NextResponse.json({ error: 'Organizer ID is required' }, { status: 400 });
    }

    try {
        const events = await getEventsByOrganizerId(organizerId);
        return NextResponse.json(events);
    } catch (error) {
        console.error('Fetch organizer events error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
