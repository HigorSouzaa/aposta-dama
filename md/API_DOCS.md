# 🎲 Damas Apostas - API Documentation

## 📚 Endpoints da API de Usuários

Base URL: `http://localhost:3000/api/users`

---

## 🔓 Rotas Públicas

### 1. Registrar Usuário
**POST** `/api/users/register`

Cria uma nova conta de usuário.

**Body:**
```json
{
  "username": "jogador123",
  "email": "jogador@example.com",
  "password": "senha123"
}
```

**Validações:**
- Username: 3-20 caracteres, apenas letras, números e underline
- Email: formato válido de email
- Senha: mínimo 6 caracteres

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Usuário cadastrado com sucesso!",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "jogador123",
      "email": "jogador@example.com",
      "balance": 100.00,
      "createdAt": "2025-11-06T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Login
**POST** `/api/users/login`

Autentica um usuário existente.

**Body:**
```json
{
  "email": "jogador@example.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso!",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "jogador123",
      "email": "jogador@example.com",
      "balance": 150.50,
      "gamesPlayed": 10,
      "gamesWon": 6,
      "totalEarnings": 250.75,
      "createdAt": "2025-11-06T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Ranking de Jogadores
**GET** `/api/users/ranking`

Obtém o ranking dos melhores jogadores.

**Query Parameters:**
- `limit` (opcional): número de jogadores (padrão: 10)
- `sortBy` (opcional): campo de ordenação - `totalEarnings`, `gamesWon`, `gamesPlayed` (padrão: `totalEarnings`)

**Exemplo:**
```
GET /api/users/ranking?limit=5&sortBy=gamesWon
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "ranking": [
      {
        "username": "campeao",
        "gamesPlayed": 50,
        "gamesWon": 35,
        "totalEarnings": 1500.00,
        "balance": 800.00
      },
      {
        "username": "vice",
        "gamesPlayed": 45,
        "gamesWon": 30,
        "totalEarnings": 1200.00,
        "balance": 650.00
      }
    ]
  }
}
```

---

## 🔒 Rotas Privadas (Requerem Autenticação)

**Header necessário:**
```
Authorization: Bearer {token}
```

### 4. Obter Perfil
**GET** `/api/users/profile`

Obtém os dados do usuário autenticado.

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "jogador123",
      "email": "jogador@example.com",
      "balance": 150.50,
      "gamesPlayed": 10,
      "gamesWon": 6,
      "totalEarnings": 250.75,
      "createdAt": "2025-11-06T12:00:00.000Z"
    }
  }
}
```

---

### 5. Atualizar Saldo
**PATCH** `/api/users/balance`

Adiciona ou subtrai valor do saldo do usuário.

**Body:**
```json
{
  "amount": 50.00,
  "operation": "add"
}
```

**Operações:**
- `add`: adiciona ao saldo
- `subtract`: subtrai do saldo (valida saldo suficiente)

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Saldo atualizado com sucesso",
  "data": {
    "balance": 200.50
  }
}
```

---

## ❌ Respostas de Erro

### Erro de Validação (400)
```json
{
  "success": false,
  "message": "Erro de validação",
  "errors": [
    "Nome de usuário deve ter pelo menos 3 caracteres",
    "Email inválido"
  ]
}
```

### Não Autorizado (401)
```json
{
  "success": false,
  "message": "Token inválido ou expirado"
}
```

### Não Encontrado (404)
```json
{
  "success": false,
  "message": "Usuário não encontrado"
}
```

### Erro do Servidor (500)
```json
{
  "success": false,
  "message": "Erro interno do servidor"
}
```

---

## 🔐 Autenticação JWT

Após login ou registro bem-sucedido, você receberá um token JWT. Use este token em todas as requisições privadas:

**Exemplo com cURL:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:3000/api/users/profile
```

**Exemplo com JavaScript (fetch):**
```javascript
fetch('http://localhost:3000/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**Token expira em:** 7 dias

---

## 🧪 Testando a API

### Com Postman/Insomnia:

1. **Registrar usuário:**
   - POST `http://localhost:3000/api/users/register`
   - Body (JSON): username, email, password
   - Copiar o token da resposta

2. **Login:**
   - POST `http://localhost:3000/api/users/login`
   - Body (JSON): email, password
   - Copiar o token da resposta

3. **Acessar rotas privadas:**
   - Adicionar header: `Authorization: Bearer {token}`
   - GET `http://localhost:3000/api/users/profile`

---

## 📝 Notas Importantes

- Todas as senhas são hasheadas com bcrypt (salt rounds: 10)
- Tokens JWT expiram em 7 dias
- Saldo inicial padrão: R$ 100,00
- Validações robustas em todas as rotas
- Respostas padronizadas com `success`, `message` e `data`
- Logs detalhados no console para debugging
