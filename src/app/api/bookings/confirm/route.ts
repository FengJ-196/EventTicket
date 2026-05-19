import { NextResponse } from 'next/server';
import { confirmPurchase } from '@/data-access/Payment';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, seatIds, amount } = body;

        const paymentMethod = 'CREDIT_CARD'; // Hardcoded for demo

        if (!userId || !seatIds || !amount) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        await confirmPurchase(userId, seatIds, paymentMethod, amount);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Confirm purchase error:', error);
        return NextResponse.json({ error: error.message || 'Purchase failed' }, { status: 500 });
    }
}
