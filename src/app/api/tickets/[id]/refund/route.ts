import { NextResponse } from 'next/server';
import { refundTicket } from '@/data-access/Ticket';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const ticketId = params.id;
        const body = await req.json();
        const { userId } = body;

        if (!ticketId || !userId) {
            return NextResponse.json({ error: 'Missing ticket ID or user ID' }, { status: 400 });
        }

        const success = await refundTicket(ticketId, userId);

        if (!success) {
            return NextResponse.json({ error: 'Refund failed. Ticket may be invalid or already refunded.' }, { status: 400 });
        }

        return NextResponse.json({ message: 'Ticket refunded successfully' });

    } catch (error: any) {
        console.error('Refund ticket error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
