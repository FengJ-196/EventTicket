export interface Payment {
    id: string; // UUID
    amount: number;
    payment_date: Date;
    method: string;
}