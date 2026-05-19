import { NextResponse } from 'next/server';
import { createUser } from '@/data-access/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, userName, password } = body;

        if (!name || !userName || !password) {
            return NextResponse.json({ error: 'Name, Username, and Password are required' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await createUser({
            name,
            userName,
            password: hashedPassword,
            role: 'USER'
        });

        // Generate JWT Tokens
        const accessToken = jwt.sign({ id: user.id, userName: user.userName, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

        const response = NextResponse.json({ success: true, user, accessToken, refreshToken });
        
        response.cookies.set('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        response.cookies.set('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });

        return response;

    } catch (error: any) {
        console.error('Registration error:', error);
        // Postgres unique violation code is 23505
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
