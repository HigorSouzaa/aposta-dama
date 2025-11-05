const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  players: {
    white: {
      type: String,
      required: true
    },
    black: {
      type: String,
      required: true
    }
  },
  betAmount: {
    type: Number,
    required: true,
    min: 0
  },
  winner: {
    type: String,
    enum: ['white', 'black', null],
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'finished', 'cancelled'],
    default: 'active'
  },
  moveHistory: [{
    from: {
      row: Number,
      col: Number
    },
    to: {
      row: Number,
      col: Number
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  finishedAt: Date
});

module.exports = mongoose.model('Game', gameSchema);
