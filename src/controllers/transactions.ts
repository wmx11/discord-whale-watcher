import { PrismaClient, Transactions } from '@prisma/client';
import { set } from 'date-fns';

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

export const getBurns = async ({
  limit,
  today,
}: {
  limit: number | string | undefined;
  today: string | boolean | undefined;
}): Promise<Transactions[]> => {
  const selectToday = today ? { created_at: { gte: set(new Date(), { hours: 0, minutes: 0, seconds: 0 }) } } : {};

  const sells: Transactions[] = await prisma.transactions.findMany({
    orderBy: [{ created_at: 'desc' }],
    take: parseInt(limit as string, 10) || 10,
    where: {
      type: -1,
      ...selectToday,
    },
  });

  return sells;
};
