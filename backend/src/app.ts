import express from "express";
import authRoutes from "./routes/auth";
import queueRoutes from "./routes/queues";
import tokenRoutes from "./routes/tokens";
import analyticsRoutes from "./routes/analytics";
import { errorHandler } from "./lib/errors";
import cors from "cors";
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "100kb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/queues", queueRoutes);
  app.use("/api/tokens", tokenRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  // Express 5 forwards rejected async handlers here automatically
  app.use(errorHandler);
  return app;
}
