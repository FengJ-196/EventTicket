export interface User {
    id: string; // UUID
    name: string;
    userName: string;
    avatar_url: string;
    role: 'USER' | 'ADMIN' | 'ORGANIZER';
    password?: string;
}