import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv"
import { validadeKey } from "../utils/validateApiKey.js";
import { CardsRoutes } from "../components/cards/card-router.js";
import { cronJobVerifyCardsInExecution } from "../components/cronjobs/verify-cards-execution.js";
import { cronJobErrorRelatory } from "../components/cronjobs/errors-day-relatory.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors({
    origin: "*",
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ["GET", "POST"]
}))

// middleware to validade API KEY
app.use("/api", validadeKey)

const { cardRoutes } = setupRoutes();
app.use(cardRoutes.getRoutes());

const port = process.env.PORT || 7000;
app.listen(port).on("listening", () => {
    console.log("servidor rodando na porta "+port);
    executeCronJobs();
})


function setupRoutes() {
    const cardRoutes = new CardsRoutes();
    return {
        cardRoutes
    };
}


function executeCronJobs() {
    cronJobVerifyCardsInExecution();
    cronJobErrorRelatory()
}