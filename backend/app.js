import express from "express";
import env from "dotenv";
import config from "./config.js";
import userRouter from "./routes/user.js";
import cors from "cors";

const app = express();
if (app.get("env") === "development") env.config();

app.use(express.json());
app.use(cors("*"));

app.use(userRouter);

app.listen(config.port, (_) => console.log("App started on port", config.port));
