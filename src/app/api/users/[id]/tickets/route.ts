import { NextResponse } from 'next/server';
import { viewPurchasedTickets } from '@/lib/models/Ticket';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const userId = params.id;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const tickets = await viewPurchasedTickets(userId);
        return NextResponse.json(tickets);
    } catch (error) {
        console.error('Fetch tickets error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
