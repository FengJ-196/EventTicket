import { NextResponse } from 'next/server';
import { getEventById, updateEvent } from '@/data-access/Event';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = params.id;
        if (!id) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        const event = await getEventById(id);

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event);

    } catch (error: any) {
        console.error('Get event details error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = params.id;
        const body = await req.json();

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const updated = await updateEvent(id, body);

        if (!updated) {
            return NextResponse.json({ error: 'Update failed or event not found' }, { status: 404 });
        }

        return NextResponse.json(updated);

    } catch (error: any) {
        console.error('Update event error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
