export interface Event {
    id: string;
    name: string;
    status: string;
    address?: string;
    event_date: LocalDateTime;
    capacity?: number;
    rows?: number;
    columns?: number;
    available_seats?: number;
    organizer_id: string;
}

export interface EventSeatMapItem {
    id: string;
    seat_id: string;
    x_coordinate: number;
    y_coordinate: number;
    status: string;
    user_id?: string;
    hold_expires_at?: Date;
    seat_type_id: string;
    seat_type: string;
    price: number;
}
