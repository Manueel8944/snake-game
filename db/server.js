import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import scoreRoutes from "./routes/scoreRoutes.js";

const app = express();
const publicDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public"
);

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.static(publicDirectory));

app.get("/", (req, res) => {
  res.redirect("/pages/index.html");
});

// Comprobar el estado del servidor.
app.get("/api/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Snake API funcionando",
  });
});

// Rutas de puntuaciones.
app.use("/api/scores", scoreRoutes);

// Gestionar rutas inexistentes.
app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada",
  });
});

// Conectar a MongoDB e iniciar el servidor.
const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Falta configurar MONGODB_URI en .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB conectado correctamente");

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error iniciando el servidor:", error.message);
    process.exit(1);
  }
};

startServer();
