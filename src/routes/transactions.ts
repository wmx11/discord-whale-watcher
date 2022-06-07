import { Router, Request, Response } from 'express';
import { getBurns, getBuys, getSells } from '../controllers/transactions';

const router: Router = Router();

router.get('/get/buys', async (req: Request, res: Response) => {
  const limit = req.query.limit;

  if (!limit) {
    return res.status(404).json({
      success: false,
      error: 'Limit not defined',
    });
  }

  if (typeof limit !== 'string') {
    return res.status(505).json({
      success: false,
      error: 'Invalid limit type',
    });
  }

  try {
    const buys = await getBuys(limit);

    return res.status(200).json({
      success: true,
      data: buys,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: (error as object).toString(),
    });
  }
});

router.get('/get/sells', async (req: Request, res: Response) => {
  const limit = req.query.limit;

  if (!limit) {
    return res.status(404).json({
      success: false,
      error: 'Limit not defined',
    });
  }

  if (typeof limit !== 'string') {
    return res.status(505).json({
      success: false,
      error: 'Invalid limit type',
    });
  }

  try {
    const buys = await getSells(limit);

    return res.status(200).json({
      success: true,
      data: buys,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: (error as object).toString(),
    });
  }
});

router.get('/get/burns', async (req: Request, res: Response) => {
  const query = {
    ...(req.query as { limit: string | undefined; today: string | undefined }),
  };

  try {
    const buys = await getBurns(query);

    return res.status(200).json({
      success: true,
      data: buys,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: (error as object).toString(),
    });
  }
});

export default router;
