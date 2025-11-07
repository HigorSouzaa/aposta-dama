/**
 * @desc    Middleware para validar dados de registro
 */
const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  // Validar username
  if (!username || username.trim().length < 3) {
    errors.push("Nome de usuário deve ter pelo menos 3 caracteres");
  }
  if (username && username.length > 20) {
    errors.push("Nome de usuário deve ter no máximo 20 caracteres");
  }
  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("Nome de usuário deve conter apenas letras, números e underline");
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Email inválido");
  }

  // Validar senha
  if (!password || password.length < 6) {
    errors.push("Senha deve ter pelo menos 6 caracteres");
  }
  if (password && password.length > 50) {
    errors.push("Senha deve ter no máximo 50 caracteres");
  }

  // Se houver erros, retornar
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Erro de validação",
      errors
    });
  }

  // Continuar para o controller
  next();
};

/**
 * @desc    Middleware para validar dados de login
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Validar email
  if (!email || !email.trim()) {
    errors.push("Email é obrigatório");
  }

  // Validar senha
  if (!password || !password.trim()) {
    errors.push("Senha é obrigatória");
  }

  // Se houver erros, retornar
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Erro de validação",
      errors
    });
  }

  // Continuar para o controller
  next();
};

/**
 * @desc    Middleware para validar atualização de saldo
 */
const validateBalance = (req, res, next) => {
  const { amount, operation } = req.body;
  const errors = [];

  // Validar amount
  if (amount === undefined || amount === null) {
    errors.push("Valor é obrigatório");
  }
  if (typeof amount !== 'number' || amount <= 0) {
    errors.push("Valor deve ser um número positivo");
  }
  if (amount > 10000) {
    errors.push("Valor máximo permitido é 10000");
  }

  // Validar operation
  if (!operation || !['add', 'subtract'].includes(operation)) {
    errors.push("Operação inválida. Use 'add' ou 'subtract'");
  }

  // Se houver erros, retornar
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Erro de validação",
      errors
    });
  }

  // Continuar para o controller
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateBalance
};
