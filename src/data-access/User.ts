import prisma from '../lib/prisma';
import { User } from '@prisma/client';

export const getUserByUserName = async (userName: string): Promise<User | null> => {
    return await prisma.user.findUnique({
        where: { userName }
    });
};

export const getUserById = async (id: string): Promise<User | null> => {
    return await prisma.user.findUnique({
        where: { id }
    });
};

export const createUser = async (userData: any): Promise<User> => {
    return await prisma.user.create({
        data: {
            name: userData.name,
            userName: userData.userName,
            password: userData.password,
            role: userData.role || 'USER'
        }
    });
};

export const updateUser = async (id: string, fields: Partial<User>): Promise<User | null> => {
    return await prisma.user.update({
        where: { id },
        data: fields
    });
};
