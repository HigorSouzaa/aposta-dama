const jwt = require("jsonwebtoken");

// Secret key para JWT (mesma do controller)
const JWT_SECRET = process.env.JWT_SECRET || "damas_apostas_secret_key_2024";

/**
 * @desc    Middleware para proteger rotas privadas
 * @usage   Adicionar antes de rotas que requerem autenticação
 */
const protect = async (req, res, next) => {
  let token;

  // Verificar se o token foi enviado no header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extrair token do header (formato: "Bearer <token>")
      token = req.headers.authorization.split(" ")[1];

      // Verificar e decodificar o token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Adicionar dados do usuário na requisição
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email
      };

      // Continuar para o próximo middleware/controller
      next();

    } catch (error) {
      console.error("❌ Erro na autenticação:", error.message);
      
      // Token expirado ou inválido
      return res.status(401).json({
        success: false,
        message: "Token inválido ou expirado"
      });
    }
  }

  // Token não foi enviado
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Acesso negado. Token não fornecido"
    });
  }
};

module.exports = { protect };
