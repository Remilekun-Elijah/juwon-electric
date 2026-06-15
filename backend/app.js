import cors from "cors";
import env from "dotenv";
import express from "express";
import config from "./config.js";
import adminRouter from "./routes/admin.js";
import publicRouter from "./routes/public.js";
import { connectDatabase } from "./services/database.js";

const app = express();
if (app.get("env") === "development") env.config();

app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
  }),
);
app.use(express.json());

app.use(publicRouter);
app.use("/api", publicRouter);
app.use("/admin", adminRouter);
app.use("/api/admin", adminRouter);

app.get("/", (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Juwon Electric API",
    modules: [
      "packages",
      "newsletter",
      "services",
      "portfolio",
      "contact",
      "cart",
      "orders",
    ],
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
    details: error.details,
  });
});

connectDatabase()
  .then(() => {
    app.listen(config.port, (_) =>
      console.log("App started on port", config.port),
    );
  })
  .catch((error) => {
    console.error("Failed to start application:", error.message);
    process.exit(1);
  });
