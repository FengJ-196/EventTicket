import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, seatIds } = body; // seatIds should be array of strings

        if (!userId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const pool = await getConnection();

        // Prepare TVP for seat_ids
        const seatList = new sql.Table('GuidList'); // Must match type name in DB? Dbo.GuidList
        // Wait, mssql driver usually creates TVP matching the type if verified, 
        // but explicit Table object is safer.
        // The type in DB is defined as: CREATE TYPE dbo.GuidList AS TABLE (id UNIQUEIDENTIFIER NOT NULL);
        seatList.columns.add('id', sql.UniqueIdentifier);

        seatIds.forEach((id: string) => {
            seatList.rows.add(id);
        });

        await pool.request()
            .input('user_id', sql.UniqueIdentifier, userId)
            .input('seat_ids', seatList) // Pass the table
            .input('hold_minutes', sql.Int, 10)
            .execute('HoldSeats');

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Hold seats error:', error);
        if (error.number === 50010) {
            return NextResponse.json({ error: 'One or more seats are not available' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
