const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// Obter todos os jogos
router.get('/games', async (req, res) => {
  try {
    const games = await Game.find({ status: 'active' });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter jogo específico
router.get('/games/:roomId', async (req, res) => {
  try {
    const game = await Game.findOne({ roomId: req.params.roomId });
    if (!game) {
      return res.status(404).json({ error: 'Jogo não encontrado' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter histórico de jogos de um usuário
router.get('/games/user/:userId', async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { 'players.white': req.params.userId },
        { 'players.black': req.params.userId }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
