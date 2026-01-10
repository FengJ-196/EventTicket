import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, seatIds, amount } = body;

        // In real app, process payment here via Stripe/etc first.
        const paymentMethod = 'CREDIT_CARD'; // Hardcoded for demo

        if (!userId || !seatIds || !amount) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const pool = await getConnection();

        const seatList = new sql.Table('GuidList');
        seatList.columns.add('id', sql.UniqueIdentifier);
        seatIds.forEach((id: string) => seatList.rows.add(id));

        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, userId)
            .input('seat_ids', seatList)
            .input('payment_method', sql.NVarChar(50), paymentMethod)
            .input('amount', sql.Decimal(10, 2), amount)
            .execute('ConfirmPurchase');

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Confirm purchase error:', error);
        return NextResponse.json({ error: error.message || 'Purchase failed' }, { status: 500 });
    }
}
