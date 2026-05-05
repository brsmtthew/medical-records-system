import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { seedDefaultAdmin } from "./models/userStore.js";
import authRoutes from "./routes/authRoutes.js";
import chartRoutes from "./routes/chartRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "medical-records-system-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/charts", chartRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

await seedDefaultAdmin();

app.listen(env.port, () => {
  console.log(`API server listening on port ${env.port}`);
});
