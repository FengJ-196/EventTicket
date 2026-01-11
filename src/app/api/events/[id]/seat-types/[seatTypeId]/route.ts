import { NextResponse } from 'next/server';
import { updateSeatType, deleteSeatType } from '@/lib/models/SeatType';

export async function PATCH(req: Request, props: { params: Promise<{ id: string, seatTypeId: string }> }) {
    try {
        const params = await props.params;
        const { id: eventId, seatTypeId } = params;
        const body = await req.json();

        const updated = await updateSeatType(seatTypeId, { ...body, event_id: eventId });
        if (!updated) return NextResponse.json({ error: 'Seat type not found' }, { status: 404 });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update seat type error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string, seatTypeId: string }> }) {
    try {
        const params = await props.params;
        const { seatTypeId } = params;

        const success = await deleteSeatType(seatTypeId);
        if (!success) return NextResponse.json({ error: 'Seat type not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete seat type error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
