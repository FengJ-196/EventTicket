import { NextResponse } from 'next/server';
import { holdSeats } from '@/data-access/Seat';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, seatIds } = body;

        if (!userId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const unavailableSeatIds = await holdSeats(userId, seatIds, 30);

        if (unavailableSeatIds.length > 0) {
            return NextResponse.json({
                error: 'Some seats are no longer available',
                unavailableSeatIds
            }, { status: 409 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        if (error.message === 'USER_NOT_FOUND') {
            return NextResponse.json({ error: 'Stale user session. Please log in again.' }, { status: 401 });
        }
        console.error('Hold seats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
