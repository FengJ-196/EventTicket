import { NextResponse } from 'next/server';
import { refundTicket } from '@/lib/models/Ticket';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const ticketId = params.id;
        const body = await req.json();
        const { userId } = body;

        if (!ticketId || !userId) {
            return NextResponse.json({ error: 'Missing ticket ID or user ID' }, { status: 400 });
        }

        await refundTicket(ticketId, userId);

        return NextResponse.json({ message: 'Ticket refunded successfully' });

    } catch (error: any) {
        console.error('Refund ticket error:', error);
        // Extract SQL error message if possible
        const msg = error.message || 'Internal server error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
