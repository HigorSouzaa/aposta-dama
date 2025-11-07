const express = require("express");
const { 
  register, 
  login, 
  getProfile, 
  updateBalance,
  getRanking 
} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const { 
  validateRegister, 
  validateLogin, 
  validateBalance 
} = require("../middlewares/validationMiddleware");

const router = express.Router();

// ==================== ROTAS PÚBLICAS ====================

/**
 * @route   POST /api/users/register
 * @desc    Registrar novo usuário
 * @access  Public
 */
router.post("/register", validateRegister, register);

/**
 * @route   POST /api/users/login
 * @desc    Autenticar usuário (Login)
 * @access  Public
 */
router.post("/login", validateLogin, login);

/**
 * @route   GET /api/users/ranking
 * @desc    Obter ranking de jogadores
 * @access  Public
 * @query   ?limit=10&sortBy=totalEarnings
 */
router.get("/ranking", getRanking);

// ==================== ROTAS PRIVADAS (Requerem autenticação) ====================

/**
 * @route   GET /api/users/profile
 * @desc    Obter perfil do usuário autenticado
 * @access  Private
 */
router.get("/profile", protect, getProfile);

/**
 * @route   PATCH /api/users/balance
 * @desc    Atualizar saldo do usuário
 * @access  Private
 * @body    { amount: Number, operation: 'add' | 'subtract' }
 */
router.patch("/balance", protect, validateBalance, updateBalance);

module.exports = router;
