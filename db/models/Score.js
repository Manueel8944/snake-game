import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    playerName: {
      type: String,
      trim: true,
      maxlength: 15,
      default: "Jugador",
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000,
      validate: {
        validator: Number.isSafeInteger,
        message: "La puntuación debe ser un número entero",
      },
    },

    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
      max: 86400,
    },
  },
  {
    timestamps: true,
  }
);

scoreSchema.index({ score: -1, createdAt: 1 });

const Score = mongoose.model("Score", scoreSchema);

export default Score;
