import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { managerId, requireAuth } from "../middleware/auth";
import { getOwnedQueue } from "./queues";
import {
  alignDown,
  computeAnalytics,
  RANGES,
  type TokenLite,
} from "../lib/analytics";

const router = Router();
router.use(requireAuth);

const querySchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
  queueId: z.string().optional(),
  // JS Date#getTimezoneOffset() of the viewer, e.g. -330 for IST
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
});

router.get("/", async (req, res) => {
  const { range, queueId, tzOffset } = querySchema.parse(req.query);
  const owner = managerId(req);
  if (queueId && queueId !== "all") await getOwnedQueue(queueId, owner);

  const queues = await prisma.queue.findMany({
    where: {
      managerId: owner,
      ...(queueId && queueId !== "all" ? { id: queueId } : {}),
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const now = Date.now();
  const cfg = RANGES[range];
  const from = new Date(
    Math.min(
      alignDown(now - cfg.span, cfg.trendBucket, tzOffset),
      alignDown(now - cfg.span, cfg.volumeBucket, tzOffset),
    ),
  );

  const rows = await prisma.token.findMany({
    where: {
      queueId: { in: queues.map((q) => q.id) },
      OR: [
        { createdAt: { gte: from } },
        { status: { in: ["WAITING", "SERVING"] } },
        { servedAt: { gte: from } },
        { completedAt: { gte: from } },
        { cancelledAt: { gte: from } },
      ],
    },
    select: {
      queueId: true,
      status: true,
      createdAt: true,
      servedAt: true,
      completedAt: true,
      cancelledAt: true,
    },
  });

  const tokens: TokenLite[] = rows.map((r) => ({
    queueId: r.queueId,
    status: r.status,
    createdAt: r.createdAt.getTime(),
    servedAt: r.servedAt?.getTime() ?? null,
    completedAt: r.completedAt?.getTime() ?? null,
    cancelledAt: r.cancelledAt?.getTime() ?? null,
  }));

  res.json(
    computeAnalytics(tokens, { range, tzOffsetMin: tzOffset, now, queues }),
  );
});

export default router;
