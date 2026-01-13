import { NextResponse } from 'next/server';
import { getSeatTransactions } from '@/lib/models/SeatTransaction';

export async function GET() {
    try {
        const transactions = await getSeatTransactions();
        return NextResponse.json(transactions);
    } catch (error: any) {
        console.error('Fetch admin transactions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
