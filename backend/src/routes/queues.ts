import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, notFound } from "../lib/errors";
import { managerId, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const queueNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
});
const addTokenSchema = z.object({
  personName: z.string().trim().min(1, "Name is required").max(100),
});

/** Ensures the queue exists and belongs to the logged-in manager. */
export async function getOwnedQueue(queueId: string, ownerId: string) {
  const queue = await prisma.queue.findFirst({
    where: { id: queueId, managerId: ownerId },
  });
  if (!queue) throw notFound("Queue");
  return queue;
}

// List all queues for the manager, with live counts
router.get("/", async (req, res) => {
  const queues = await prisma.queue.findMany({
    where: { managerId: managerId(req) },
    orderBy: { createdAt: "asc" },
  });
  const counts = await prisma.token.groupBy({
    by: ["queueId", "status"],
    where: {
      queueId: { in: queues.map((q) => q.id) },
      status: { in: ["WAITING", "SERVING"] },
    },
    _count: { _all: true },
  });
  const countFor = (queueId: string, status: string) =>
    counts.find((c) => c.queueId === queueId && c.status === status)?._count
      ._all ?? 0;

  res.json({
    queues: queues.map((q) => ({
      id: q.id,
      name: q.name,
      createdAt: q.createdAt,
      waitingCount: countFor(q.id, "WAITING"),
      servingCount: countFor(q.id, "SERVING"),
    })),
  });
});

router.post("/", async (req, res) => {
  const { name } = queueNameSchema.parse(req.body);
  const queue = await prisma.queue.create({
    data: { name, managerId: managerId(req) },
  });
  res.status(201).json({ queue });
});

// Full queue state: waiting line, now serving, recent history
router.get("/:id", async (req, res) => {
  const queue = await getOwnedQueue(req.params.id, managerId(req));
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [waiting, serving, serviceStats, history] = await Promise.all([
    prisma.token.findMany({
      where: { queueId: queue.id, status: "WAITING" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.token.findMany({
      where: { queueId: queue.id, status: "SERVING" },
      orderBy: { servedAt: "asc" },
    }),
    prisma.token.findMany({
      where: {
        queueId: queue.id,
        status: "SERVED",
        completedAt: { gte: since },
        servedAt: { not: null },
      },
      select: { servedAt: true, completedAt: true },
    }),
    // Recent history: most recently finished or cancelled tokens
    prisma.$queryRaw<
      {
        id: string;
        number: number;
        personName: string;
        status: string;
        finishedAt: Date;
      }[]
    >`
      SELECT id, number, "personName", status::text AS status,
             COALESCE("completedAt", "cancelledAt") AS "finishedAt"
      FROM "Token"
      WHERE "queueId" = ${queue.id} AND status IN ('SERVED', 'CANCELLED')
      ORDER BY COALESCE("completedAt", "cancelledAt") DESC
      LIMIT 10`,
  ]);

  const durations = serviceStats.map(
    (t) => t.completedAt!.getTime() - t.servedAt!.getTime(),
  );
  const avgServiceSeconds = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000)
    : null;

  res.json({ queue, waiting, serving, history, avgServiceSeconds });
});

router.patch("/:id", async (req, res) => {
  const { name } = queueNameSchema.parse(req.body);
  await getOwnedQueue(req.params.id, managerId(req));
  const queue = await prisma.queue.update({
    where: { id: req.params.id },
    data: { name },
  });
  res.json({ queue });
});

router.delete("/:id", async (req, res) => {
  await getOwnedQueue(req.params.id, managerId(req));
  await prisma.queue.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Add a person to the back of the queue -> creates a token
router.post("/:id/tokens", async (req, res) => {
  const { personName } = addTokenSchema.parse(req.body);
  await getOwnedQueue(req.params.id, managerId(req));

  const token = await prisma.$transaction(async (tx) => {
    // Atomically reserve the next token number for this queue
    const q = await tx.queue.update({
      where: { id: req.params.id },
      data: { nextTokenNumber: { increment: 1 } },
    });
    const last = await tx.token.aggregate({
      where: { queueId: q.id, status: "WAITING" },
      _max: { position: true },
    });
    return tx.token.create({
      data: {
        queueId: q.id,
        number: q.nextTokenNumber - 1,
        personName,
        position: (last._max.position ?? 0) + 1,
      },
    });
  });
  res.status(201).json({ token });
});

/**
 * Assign the token at the top of the queue for service.
 * Whoever is currently being served at this queue is marked as served first,
 * so one click = "finish current, call next".
 */
router.post("/:id/serve-next", async (req, res) => {
  const queue = await getOwnedQueue(req.params.id, managerId(req));
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const completed = await tx.token.updateMany({
      where: { queueId: queue.id, status: "SERVING" },
      data: { status: "SERVED", completedAt: now },
    });

    // Retry guard: if two requests race for the same top token, only one wins.
    for (let attempt = 0; attempt < 3; attempt++) {
      const next = await tx.token.findFirst({
        where: { queueId: queue.id, status: "WAITING" },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
      if (!next) return { serving: null, completedCount: completed.count };
      const claimed = await tx.token.updateMany({
        where: { id: next.id, status: "WAITING" },
        data: { status: "SERVING", servedAt: now },
      });
      if (claimed.count === 1) {
        const serving = await tx.token.findUnique({ where: { id: next.id } });
        return { serving, completedCount: completed.count };
      }
    }
    throw new HttpError(409, "Queue changed while assigning, please retry");
  });

  res.json(result);
});

export default router;
