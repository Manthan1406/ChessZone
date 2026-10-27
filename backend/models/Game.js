
import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    players: [
      {
        name: { type: String, required: true },
      },
    ],
    moves: [
      {
        player: String,
        move: mongoose.Schema.Types.Mixed,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    result: {
      type: String,
      default: 'in-progress',
    },
    winner: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Game', gameSchema);
