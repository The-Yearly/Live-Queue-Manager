import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";
import { managerId, requireAuth, signToken } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const publicManager = (m: { id: string; email: string; name: string }) => ({
  id: m.id,
  email: m.email,
  name: m.name,
});

router.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  console.log("IN");
  const manager = await prisma.manager.findUnique({ where: { email } });
  if (!manager || !(await bcrypt.compare(password, manager.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }
  res.json({
    token: signToken({ managerId: manager.id, email: manager.email }),
    manager: publicManager(manager),
  });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const exists = await prisma.manager.findUnique({ where: { email } });
  if (exists)
    throw new HttpError(409, "An account with this email already exists");
  const manager = await prisma.manager.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({
    token: signToken({ managerId: manager.id, email: manager.email }),
    manager: publicManager(manager),
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const manager = await prisma.manager.findUnique({
    where: { id: managerId(req) },
  });
  if (!manager) throw new HttpError(401, "Account no longer exists");
  res.json({ manager: publicManager(manager) });
});

export default router;
