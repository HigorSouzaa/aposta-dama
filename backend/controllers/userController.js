const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Secret key para JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || "damas_apostas_secret_key_2024";
const JWT_EXPIRES_IN = "7d"; // Token expira em 7 dias

/**
 * @desc    Registrar novo usuário
 * @route   POST /api/users/register
 * @access  Public
 */
const register = async (req, res) => {
  const { username, password, email } = req.body;

  try {
    // Validação de campos obrigatórios
    if (!username || !password || !email) {
      return res.status(400).json({ 
        success: false,
        message: "Por favor, preencha todos os campos obrigatórios" 
      });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: "Email inválido" 
      });
    }

    // Validação de senha (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "A senha deve ter pelo menos 6 caracteres" 
      });
    }

    // Validação de username (mínimo 3 caracteres)
    if (username.length < 3) {
      return res.status(400).json({ 
        success: false,
        message: "O nome de usuário deve ter pelo menos 3 caracteres" 
      });
    }

    // Verificar se email já está cadastrado
    const userExistsByEmail = await User.findOne({ email });
    if (userExistsByEmail) {
      return res.status(400).json({ 
        success: false,
        message: "Este email já está cadastrado" 
      });
    }

    // Verificar se username já está cadastrado
    const userExistsByUsername = await User.findOne({ username });
    if (userExistsByUsername) {
      return res.status(400).json({ 
        success: false,
        message: "Este nome de usuário já está em uso" 
      });
    }

    // Criar novo usuário
    const user = new User({
      username,
      password, // Será hasheado automaticamente pelo pre-save hook
      email,
    });

    // Salvar no banco de dados
    await user.save();

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retornar sucesso com dados do usuário (sem senha)
    return res.status(201).json({ 
      success: true,
      message: "Usuário cadastrado com sucesso!",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (err) {
    console.error("❌ Erro no register:", err);
    return res.status(500).json({ 
      success: false,
      message: "Erro interno do servidor" 
    });
  }
};

/**
 * @desc    Autenticar usuário (Login)
 * @route   POST /api/users/login
 * @access  Public
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validação de campos obrigatórios
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Por favor, informe email e senha" 
      });
    }

    // Buscar usuário por email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Email ou senha incorretos" 
      });
    }

    // Verificar senha usando o método do model
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Email ou senha incorretos" 
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retornar sucesso com dados do usuário (sem senha)
    return res.status(200).json({ 
      success: true,
      message: "Login realizado com sucesso!",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          totalEarnings: user.totalEarnings,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (err) {
    console.error("❌ Erro no login:", err);
    return res.status(500).json({ 
      success: false,
      message: "Erro interno do servidor" 
    });
  }
};

/**
 * @desc    Obter perfil do usuário autenticado
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    // req.user é definido pelo middleware de autenticação
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "Usuário não encontrado" 
      });
    }

    return res.status(200).json({ 
      success: true,
      data: { user }
    });

  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err);
    return res.status(500).json({ 
      success: false,
      message: "Erro interno do servidor" 
    });
  }
};

/**
 * @desc    Atualizar saldo do usuário
 * @route   PATCH /api/users/balance
 * @access  Private
 */
const updateBalance = async (req, res) => {
  const { amount, operation } = req.body; // operation: 'add' ou 'subtract'

  try {
    // Validações
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ 
        success: false,
        message: "Valor inválido" 
      });
    }

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({ 
        success: false,
        message: "Operação inválida. Use 'add' ou 'subtract'" 
      });
    }

    // Buscar usuário
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "Usuário não encontrado" 
      });
    }

    // Atualizar saldo
    if (operation === 'add') {
      user.balance += amount;
    } else {
      // Verificar se tem saldo suficiente
      if (user.balance < amount) {
        return res.status(400).json({ 
          success: false,
          message: "Saldo insuficiente" 
        });
      }
      user.balance -= amount;
    }

    await user.save();

    return res.status(200).json({ 
      success: true,
      message: "Saldo atualizado com sucesso",
      data: { 
        balance: user.balance 
      }
    });

  } catch (err) {
    console.error("❌ Erro ao atualizar saldo:", err);
    return res.status(500).json({ 
      success: false,
      message: "Erro interno do servidor" 
    });
  }
};

/**
 * @desc    Obter ranking de jogadores
 * @route   GET /api/users/ranking
 * @access  Public
 */
const getRanking = async (req, res) => {
  try {
    const { limit = 10, sortBy = 'totalEarnings' } = req.query;

    // Validar campo de ordenação
    const validSortFields = ['totalEarnings', 'gamesWon', 'gamesPlayed'];
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ 
        success: false,
        message: "Campo de ordenação inválido" 
      });
    }

    // Buscar top jogadores
    const ranking = await User
      .find()
      .select('username gamesPlayed gamesWon totalEarnings balance')
      .sort({ [sortBy]: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({ 
      success: true,
      data: { ranking }
    });

  } catch (err) {
    console.error("❌ Erro ao buscar ranking:", err);
    return res.status(500).json({ 
      success: false,
      message: "Erro interno do servidor" 
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateBalance,
  getRanking
};
