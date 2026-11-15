import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, notFound } from "../lib/errors";
import { managerId, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const moveSchema = z.object({ direction: z.enum(["up", "down"]) });

async function getOwnedToken(tokenId: string, ownerId: string) {
  const token = await prisma.token.findFirst({
    where: { id: tokenId, queue: { managerId: ownerId } },
  });
  if (!token) throw notFound("Token");
  return token;
}

// Move a waiting token one place up (towards the front) or down
router.post("/:id/move", async (req, res) => {
  const { direction } = moveSchema.parse(req.body);
  const token = await getOwnedToken(req.params.id, managerId(req));
  if (token.status !== "WAITING")
    throw new HttpError(400, "Only waiting tokens can be moved");

  const moved = await prisma.$transaction(async (tx) => {
    const neighbour = await tx.token.findFirst({
      where: {
        queueId: token.queueId,
        status: "WAITING",
        position:
          direction === "up" ? { lt: token.position } : { gt: token.position },
      },
      orderBy: { position: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbour) return false; // already at the top / bottom
    await tx.token.update({
      where: { id: neighbour.id },
      data: { position: token.position },
    });
    await tx.token.update({
      where: { id: token.id },
      data: { position: neighbour.position },
    });
    return true;
  });

  res.json({ moved });
});

// Cancel a token (waiting, or a no-show while being served)
router.post("/:id/cancel", async (req, res) => {
  const token = await getOwnedToken(req.params.id, managerId(req));
  if (token.status !== "WAITING" && token.status !== "SERVING") {
    throw new HttpError(400, `Token is already ${token.status.toLowerCase()}`);
  }
  const updated = await prisma.token.update({
    where: { id: token.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  res.json({ token: updated });
});

// Mark the token currently being served as done
router.post("/:id/complete", async (req, res) => {
  const token = await getOwnedToken(req.params.id, managerId(req));
  if (token.status !== "SERVING")
    throw new HttpError(400, "Only tokens being served can be completed");
  const updated = await prisma.token.update({
    where: { id: token.id },
    data: { status: "SERVED", completedAt: new Date() },
  });
  res.json({ token: updated });
});

export default router;
