import { PrismaClient, Transactions } from '@prisma/client';

const prisma: PrismaClient = new PrismaClient();

export const getBuys = async (limit: string | number | undefined): Promise<Transactions[]> => {
  const buys: Transactions[] = await prisma.transactions.findMany({
    orderBy: [{ created_at: 'desc' }],
    take: parseInt(limit as string, 10) || 10,
    where: {
      type: 1,
    },
  });

  return buys;
};

export const getSells = async (limit: string | number | undefined): Promise<Transactions[]> => {
  const sells: Transactions[] = await prisma.transactions.findMany({
    orderBy: [{ created_at: 'desc' }],
    take: parseInt(limit as string, 10) || 10,
    where: {
      type: 0,
    },
  });

  return sells;
};
