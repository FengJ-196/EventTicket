import { getConnection, sql } from '../db';

export interface Payment {
    id: string; // UUID
    amount: number;
    payment_date: Date;
    method: string;
}

export const getAllPayments = async (): Promise<Payment[]> => {
    const pool = await getConnection();
    const result = await pool.request().execute('GetAllPayments');
    return result.recordset as Payment[];
};

export const getPaymentById = async (id: string): Promise<Payment | null> => {
    const pool = await getConnection();
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .execute('GetPaymentById');
    return (result.recordset[0] as Payment) || null;
};

export const confirmPurchase = async (
    userId: string,
    seatIds: string[],
    paymentMethod: string,
    amount: number
): Promise<void> => {
    const pool = await getConnection();
    const tvp = new sql.Table();
    tvp.columns.add('id', sql.UniqueIdentifier);
    for (const id of seatIds) tvp.rows.add(id);

    await pool.request()
        .input('user_id', sql.UniqueIdentifier, userId)
        .input('seat_ids', tvp)
        .input('payment_method', sql.NVarChar(50), paymentMethod)
        .input('amount', sql.Decimal(10, 2), amount)
        .execute('ConfirmPurchase');
};
