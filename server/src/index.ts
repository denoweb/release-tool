import express from "express";
import cors from "cors";
import { tasksRouter } from "./routes/tasks.js";
import { servicesRouter } from "./routes/services.js";
import { releasesRouter } from "./routes/releases.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3003);

app.use(cors());
app.use(express.json());

app.use("/api/tasks", tasksRouter);
app.use("/api/services", servicesRouter);
app.use("/api/releases", releasesRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
