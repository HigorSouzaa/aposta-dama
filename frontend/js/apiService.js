/**
 * API Service - Funções para comunicação com o backend
 * Base URL da API
 */
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Classe para gerenciar autenticação e requisições à API
 */
class ApiService {
  
  /**
   * Obter token do localStorage
   */
  static getToken() {
    return localStorage.getItem('authToken');
  }

  /**
   * Salvar token no localStorage
   */
  static setToken(token) {
    localStorage.setItem('authToken', token);
  }

  /**
   * Remover token do localStorage
   */
  static removeToken() {
    localStorage.removeItem('authToken');
  }

  /**
   * Salvar dados do usuário no localStorage
   */
  static setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Obter dados do usuário do localStorage
   */
  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Remover dados do usuário do localStorage
   */
  static removeUser() {
    localStorage.removeItem('user');
  }

  /**
   * Fazer requisição HTTP
   */
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    // Configurar headers padrão
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Adicionar token se existir e não for rota pública
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      // Se não autorizado, fazer logout
      if (response.status === 401) {
        this.logout();
        window.location.href = '/login';
      }

      return {
        success: response.ok,
        status: response.status,
        data
      };

    } catch (error) {
      console.error('Erro na requisição:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== AUTENTICAÇÃO ====================

  /**
   * Registrar novo usuário
   */
  static async register(username, email, password) {
    const response = await this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
      skipAuth: true
    });

    if (response.success && response.data.success) {
      // Salvar token e dados do usuário
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }

    return response;
  }

  /**
   * Fazer login
   */
  static async login(email, password) {
    const response = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true
    });

    if (response.success && response.data.success) {
      // Salvar token e dados do usuário
      this.setToken(response.data.data.token);
      this.setUser(response.data.data.user);
    }

    return response;
  }

  /**
   * Fazer logout
   */
  static logout() {
    this.removeToken();
    this.removeUser();
  }

  // ==================== PERFIL ====================

  /**
   * Obter perfil do usuário autenticado
   */
  static async getProfile() {
    const response = await this.request('/users/profile', {
      method: 'GET'
    });

    if (response.success && response.data.success) {
      // Atualizar dados do usuário no localStorage
      this.setUser(response.data.data.user);
    }

    return response;
  }

  /**
   * Atualizar saldo
   */
  static async updateBalance(amount, operation) {
    return await this.request('/users/balance', {
      method: 'PATCH',
      body: JSON.stringify({ amount, operation })
    });
  }

  // ==================== RANKING ====================

  /**
   * Obter ranking de jogadores
   */
  static async getRanking(limit = 10, sortBy = 'totalEarnings') {
    return await this.request(`/users/ranking?limit=${limit}&sortBy=${sortBy}`, {
      method: 'GET',
      skipAuth: true
    });
  }

  // ==================== VERIFICAÇÕES ====================

  /**
   * Verificar se usuário está autenticado
   */
  static isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Verificar se usuário tem saldo suficiente
   */
  static hasSufficientBalance(amount) {
    const user = this.getUser();
    return user && user.balance >= amount;
  }
}

// ==================== EXEMPLOS DE USO ====================

/**
 * Exemplo 1: Registrar usuário
 */
async function exemploRegistro() {
  try {
    const response = await ApiService.register(
      'jogador123',
      'jogador@example.com',
      'senha123'
    );

    if (response.data.success) {
      console.log('✅ Registro bem-sucedido!');
      console.log('Token:', ApiService.getToken());
      console.log('Usuário:', ApiService.getUser());
      
      // Redirecionar para o jogo
      window.location.href = '/jogo';
    } else {
      console.error('❌ Erro no registro:', response.data.message);
      if (response.data.errors) {
        response.data.errors.forEach(err => console.error('  -', err));
      }
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 2: Fazer login
 */
async function exemploLogin() {
  try {
    const response = await ApiService.login(
      'jogador@example.com',
      'senha123'
    );

    if (response.data.success) {
      console.log('✅ Login bem-sucedido!');
      console.log('Usuário:', ApiService.getUser());
      
      // Redirecionar para o jogo
      window.location.href = '/jogo';
    } else {
      console.error('❌ Erro no login:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 3: Obter perfil
 */
async function exemploPerfil() {
  try {
    const response = await ApiService.getProfile();

    if (response.data.success) {
      console.log('✅ Perfil obtido:', response.data.data.user);
    } else {
      console.error('❌ Erro ao obter perfil:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 4: Atualizar saldo (adicionar)
 */
async function exemploAdicionarSaldo() {
  try {
    const response = await ApiService.updateBalance(50, 'add');

    if (response.data.success) {
      console.log('✅ Saldo atualizado:', response.data.data.balance);
    } else {
      console.error('❌ Erro ao atualizar saldo:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 5: Obter ranking
 */
async function exemploRanking() {
  try {
    const response = await ApiService.getRanking(5, 'gamesWon');

    if (response.data.success) {
      console.log('✅ Top 5 jogadores:', response.data.data.ranking);
    } else {
      console.error('❌ Erro ao obter ranking:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 6: Verificar autenticação
 */
function exemploVerificarAuth() {
  if (ApiService.isAuthenticated()) {
    console.log('✅ Usuário autenticado');
    console.log('Dados:', ApiService.getUser());
  } else {
    console.log('❌ Usuário não autenticado');
    window.location.href = '/login';
  }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
}
