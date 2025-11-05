const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Obter saldo
router.get('/wallet/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adicionar fundos
router.post('/wallet/deposit', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    user.balance += amount;
    await user.save();

    res.json({ balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sacar fundos
router.post('/wallet/withdraw', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    user.balance -= amount;
    await user.save();

    res.json({ balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
