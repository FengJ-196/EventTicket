import { NextResponse } from 'next/server';
import { assignSeatTypeByRectangle } from '@/lib/models/SeatType';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const eventId = params.id;
        const body = await req.json();
        const { seatTypeName, x1, y1, x2, y2 } = body;

        if (!seatTypeName || x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await assignSeatTypeByRectangle(eventId, seatTypeName, x1, y1, x2, y2);

        return NextResponse.json({ success: true, message: 'Seats assigned successfully' });
    } catch (error: any) {
        console.error('Assign seats error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
