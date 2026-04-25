export interface Seat {
    id: string; // UUID
    event_id: string;
    x_coordinate: number;
    y_coordinate: number;
    seat_type_id: string;
    user_id?: string | null;
    status: string;
}