import { NextResponse } from 'next/server';
import { getUserByUserName, createUser } from '@/data-access/User';
import { bookSeatsDirectly } from '@/data-access/Payment';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { seatIds, userName } = body;

        if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return NextResponse.json({ error: 'No seats selected' }, { status: 400 });
        }

        // 1. Find or Create User
        let user = await getUserByUserName(userName || 'Guest');
        if (!user) {
            user = await createUser({
                name: userName || 'Guest',
                userName: userName || `guest_${Date.now()}`,
                password: '123',
                role: 'USER'
            });
        }

        // 2. Book Seats Directly (Atomic Transaction in Data Access Layer)
        const bookingId = await bookSeatsDirectly(user.id, seatIds);

        return NextResponse.json({ success: true, bookingId });

    } catch (error: any) {
        console.error('Booking error:', error);
        
        // Handle specific domain errors
        const status = error.message.includes('not available') ? 409 : 500;
        return NextResponse.json({ 
            error: error.message || 'Booking failed' 
        }, { status });
    }
}
