import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { updateEvent } from '@/lib/models/Event';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = params.id;
        const body = await req.json();
        const { status } = body;

        console.log(`Updating event ${id} status to ${status}`);

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const validStatuses = ['DRAFT', 'PENDING', 'VERIFY', 'PUBLISHED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Use the model function
        const updatedEvent = await updateEvent(id, { status });

        if (!updatedEvent) {
            return NextResponse.json({ error: 'Event not found or update failed' }, { status: 404 });
        }

        return NextResponse.json({ success: true, event: updatedEvent });

    } catch (error: any) {
        console.error('Update status error:', error);
        // Check for specific trigger errors (e.g. generation failed)
        if (error.message && error.message.includes('TRIGGER')) {
            return NextResponse.json({ error: 'State transition failed: ' + error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
