import { getConnection, sql } from '../db';

export interface Payment {
    id: string; // UUID
    amount: number;
    payment_date: Date;
    method: string;
}

export const getAllPayments = async (): Promise<Payment[]> => {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Payment');
    return result.recordset as Payment[];
};

export const getPaymentById = async (id: string): Promise<Payment | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM Payment WHERE id = @id');
    return (result.recordset[0] as Payment) || null;
};

export const createPayment = async (payment: Omit<Payment, 'id'>): Promise<Payment> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('amount', sql.Decimal(10, 2), payment.amount)
        .input('payment_date', sql.DateTime, payment.payment_date)
        .input('method', sql.NVarChar(50), payment.method)
        .query(`
            INSERT INTO Payment (amount, payment_date, method)
            OUTPUT INSERTED.*
            VALUES (@amount, @payment_date, @method)
        `);
    return result.recordset[0] as Payment;
};

export const updatePayment = async (id: string, fields: Partial<Omit<Payment, 'id'>>): Promise<Payment | null> => {
    const pool = await getConnection();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    const updates: string[] = [];

    if (fields.amount !== undefined) { request.input('amount', sql.Decimal(10, 2), fields.amount); updates.push('amount = @amount'); }
    if (fields.payment_date !== undefined) { request.input('payment_date', sql.DateTime, fields.payment_date); updates.push('payment_date = @payment_date'); }
    if (fields.method !== undefined) { request.input('method', sql.NVarChar(50), fields.method); updates.push('method = @method'); }

    if (updates.length === 0) return getPaymentById(id);

    const query = `
        UPDATE Payment
        SET ${updates.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
    `;

    const result = await request.query(query);
    return (result.recordset[0] as Payment) || null;
};

export const deletePayment = async (id: string): Promise<boolean> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('DELETE FROM Payment WHERE id = @id');
    return result.rowsAffected[0] > 0;
};

// Uses Stored Procedure: ConfirmPurchase
export const confirmPurchase = async (
    userId: string,
    seatIds: string[],
    paymentMethod: string,
    amount: number
): Promise<void> => {
    const pool = await getConnection();

    // Helper to create TVP
    const tvp = new sql.Table();
    tvp.columns.add('id', sql.UniqueIdentifier);

    for (const id of seatIds) {
        tvp.rows.add(id);
    }

    await pool.request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('seat_ids', tvp)
        .input('payment_method', sql.NVarChar(50), paymentMethod)
        .input('amount', sql.Decimal(10, 2), amount)
        .execute('ConfirmPurchase');
};

