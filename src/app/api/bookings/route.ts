import { NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { User } from '@/lib/models';

export async function POST(req: Request) {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
        const body = await req.json();
        const { seatIds, userName } = body;

        if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return NextResponse.json({ error: 'No seats selected' }, { status: 400 });
        }

        await transaction.begin();

        // 1. Find or Create User
        let user: User | null = null;
        const userReq = new sql.Request(transaction);
        userReq.input('userName', sql.NVarChar(100), userName || 'Guest');

        const userRes = await userReq.query(`SELECT * FROM [User] WHERE userName = @userName`);

        if (userRes.recordset.length > 0) {
            user = userRes.recordset[0] as User;
        } else {
            const createUserReq = new sql.Request(transaction);
            const finalUserName = userName || `guest_${Date.now()}`;
            createUserReq.input('name', sql.NVarChar(100), userName || 'Guest');
            createUserReq.input('userName', sql.NVarChar(100), finalUserName);
            createUserReq.input('password', sql.NVarChar(100), '123');

            const createRes = await createUserReq.query(`
                INSERT INTO [User] (name, userName, password)
                OUTPUT INSERTED.*
                VALUES (@name, @userName, @password)
            `);
            user = createRes.recordset[0] as User;
        }

        // 2. Validate Seats and Calculate Total
        // Query Seats with Locking (UPDLOCK) to prevent partial bookings
        const seatReq = new sql.Request(transaction);

        // Parameterize the IN clause
        seatIds.forEach((id: string, index: number) => {
            seatReq.input(`seatId${index}`, sql.UniqueIdentifier, id);
        });
        const paramNames = seatIds.map((_, index) => `@seatId${index}`).join(', ');

        const seatsQuery = `
            SELECT s.*, st.price
            FROM Seat s
            JOIN SeatType st ON s.seat_type_id = st.id
            WITH (UPDLOCK, HOLDLOCK)
            WHERE s.id IN (${paramNames})
        `;

        const seatsRes = await seatReq.query(seatsQuery);
        const seats = seatsRes.recordset;

        if (seats.length !== seatIds.length) {
            throw new Error('Some seats not found');
        }

        let totalAmount = 0;

        for (const seat of seats) {
            if (seat.status !== 'AVAILABLE') {
                throw new Error(`Seat at Row ${seat.y_coordinate}, Col ${seat.x_coordinate} is not available.`);
            }
            totalAmount += seat.price; // price comes from join
        }

        // 3. Create Payment
        const paymentReq = new sql.Request(transaction);
        paymentReq.input('amount', sql.Decimal(10, 2), totalAmount);
        paymentReq.input('payment_date', sql.DateTime, new Date());
        paymentReq.input('method', sql.NVarChar(50), 'CREDIT_CARD');

        const paymentRes = await paymentReq.query(`
            INSERT INTO Payment (amount, payment_date, method)
            OUTPUT INSERTED.id
            VALUES (@amount, @payment_date, @method)
        `);
        const payment = paymentRes.recordset[0];

        // 4. Process each seat: Update Status, Create Ticket, Create Transaction
        for (const seat of seats) {
            // Update Seat
            const updateSeatReq = new sql.Request(transaction);
            updateSeatReq.input('seatId', sql.UniqueIdentifier, seat.id);
            updateSeatReq.input('userId', sql.UniqueIdentifier, user!.id);
            updateSeatReq.query(`
                UPDATE Seat 
                SET status = 'BOOKED', user_id = @userId 
                WHERE id = @seatId
            `);

            // Create Ticket
            const ticketReq = new sql.Request(transaction);
            ticketReq.input('seatId', sql.UniqueIdentifier, seat.id);
            ticketReq.input('paymentId', sql.UniqueIdentifier, payment.id);
            const ticketRes = await ticketReq.query(`
                INSERT INTO Ticket (seat_id, payment_id)
                OUTPUT INSERTED.id
                VALUES (@seatId, @paymentId)
            `);
            const ticket = ticketRes.recordset[0];

            // Create Transaction
            const transReq = new sql.Request(transaction);
            transReq.input('seatId', sql.UniqueIdentifier, seat.id);
            transReq.input('userId', sql.UniqueIdentifier, user!.id);
            transReq.input('action', sql.NVarChar(20), 'BOOK');
            transReq.input('ticketId', sql.UniqueIdentifier, ticket.id);
            transReq.input('createdAt', sql.DateTime, new Date());

            await transReq.query(`
                INSERT INTO SeatTransaction (seat_id, user_id, action, ticket_id, created_at)
                VALUES (@seatId, @userId, @action, @ticketId, @createdAt)
            `);
        }

        await transaction.commit();

        return NextResponse.json({ success: true, bookingId: payment.id });

    } catch (error: any) {
        if (transaction.listenerCount('rollback') === 0) { // Check if valid to rollback
            // Actually just try catch rollback
            try { await transaction.rollback(); } catch (e) { }
        }
        console.error('Booking error:', error);
        return NextResponse.json({ error: error.message || 'Booking failed' }, { status: 500 });
    }
}

