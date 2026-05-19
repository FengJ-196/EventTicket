import prisma from '../lib/prisma';

export const getSeatTransactions = async (): Promise<any[]> => {
    return await prisma.seatTransaction.findMany({
        include: {
            user: {
                select: { name: true, userName: true }
            },
            seat: {
                include: {
                    event: {
                        select: { name: true }
                    }
                }
            }
        },
        orderBy: { created_at: 'desc' }
    });
};
