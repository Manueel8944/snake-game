import Score from "../models/Score.js";

// Función para obtener las 10 mejores puntuaciones.
export const getTopScores = async (req, res) => {
  try {
    const scores = await Score.find()
      .select("playerName score durationSeconds createdAt")
      .sort({ score: -1, createdAt: 1 })
      .limit(10)
      .lean();

    return res.status(200).json(scores);
  } catch (error) {
    console.error("Error obteniendo puntuaciones:", error);

    return res.status(500).json({
      message: "Error al obtener las puntuaciones",
    });
  }
};

// Función para crear una nueva puntuación.
export const createScore = async (req, res) => {
  try {
    const { playerName, score, durationSeconds } = req.body;

    if (
      !Number.isSafeInteger(score) ||
      score < 0 ||
      score > 1000000
    ) {
      return res.status(400).json({
        message: "La puntuación no es válida",
      });
    }

    if (
      !Number.isSafeInteger(durationSeconds) ||
      durationSeconds < 0 ||
      durationSeconds > 86400
    ) {
      return res.status(400).json({
        message: "La duración no es válida",
      });
    }

    const safeName =
      typeof playerName === "string" && playerName.trim()
        ? playerName.trim().slice(0, 15)
        : "Jugador";

    const newScore = await Score.create({
      playerName: safeName,
      score,
      durationSeconds,
    });

    return res.status(201).json({
      message: "Puntuación guardada correctamente",
      score: newScore,
    });
  } catch (error) {
    console.error("Error guardando puntuación:", error);

    return res.status(500).json({
      message: "Error al guardar la puntuación",
    });
  }
};
