export interface Ticket {
    id: string; // UUID
    seat_id: string;
    payment_id: string;
    price: number;
    status: string;
}

export interface PurchasedTicket {
    payment_id: string;
    event_name: string;
    event_date: Date;
    seat_id: string;
    x_coordinate: number;
    y_coordinate: number;
    seat_type: string;
    price: number;
    seat_status: string;
    status: string;
    payment_date: Date;
}
