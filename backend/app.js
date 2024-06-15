import express from "express";
import env from "dotenv";
import config from "./config.js";
import userRouter from "./routes/user.js";
import cors from "cors";

const app = express();
if (app.get("env") === "development") env.config();

app.use(cors("*"));
app.use(express.json());

app.use(userRouter);

app.get("/", (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Juwon Electric API",
  });
});

app.listen(config.port, (_) => console.log("App started on port", config.port));
