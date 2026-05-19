import { NextResponse } from 'next/server';
import { getPendingEvents } from '@/data-access/Event';

export async function GET() {
    try {
        const events = await getPendingEvents();
        return NextResponse.json(events);
    } catch (error) {
        console.error('Fetch admin events error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
