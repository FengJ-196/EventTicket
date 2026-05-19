import { NextResponse } from 'next/server';
import { updateEvent } from '@/data-access/Event';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = params.id;
        const body = await req.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const validStatuses = ['DRAFT', 'PENDING', 'VERIFY', 'PUBLISHED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updatedEvent = await updateEvent(id, { status });

        if (!updatedEvent) {
            return NextResponse.json({ error: 'Event not found or update failed' }, { status: 404 });
        }

        return NextResponse.json({ success: true, event: updatedEvent });

    } catch (error: any) {
        console.error('Update status error:', error);
        return NextResponse.json({
            error: 'Update failed',
            message: error.message
        }, { status: 500 });
    }
}
