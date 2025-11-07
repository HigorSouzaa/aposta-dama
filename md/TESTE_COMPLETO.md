# 🧪 Guia de Teste Completo - Sistema de Autenticação

## 📋 Pré-requisitos

Antes de começar os testes, certifique-se de que:

1. ✅ MongoDB está rodando
2. ✅ Arquivo `.env` está configurado
3. ✅ Dependências instaladas (`npm install`)
4. ✅ Servidor backend rodando (`npm start`)

---

## 🚀 Passo 1: Iniciar o Servidor

```bash
# Navegar até o backend
cd backend

# Instalar dependências (se ainda não instalou)
npm install

# Iniciar o servidor
npm start
```

**Saída esperada:**
```
🚀 Servidor rodando na porta 3000
✅ MongoDB conectado com sucesso
```

---

## 🧪 Passo 2: Testes com Postman/Insomnia

### 📝 Teste 1: Registro de Novo Usuário

**Endpoint:** `POST http://localhost:3000/api/users/register`

**Body (JSON):**
```json
{
  "username": "jogador123",
  "email": "jogador@example.com",
  "password": "senha123"
}
```

**Resposta esperada (201):**
```json
{
  "success": true,
  "message": "Usuário registrado com sucesso",
  "data": {
    "user": {
      "_id": "...",
      "username": "jogador123",
      "email": "jogador@example.com",
      "balance": 0,
      "gamesPlayed": 0,
      "gamesWon": 0,
      "gamesLost": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 🔐 Teste 2: Login

**Endpoint:** `POST http://localhost:3000/api/users/login`

**Body (JSON):**
```json
{
  "email": "jogador@example.com",
  "password": "senha123"
}
```

**Resposta esperada (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "_id": "...",
      "username": "jogador123",
      "email": "jogador@example.com",
      "balance": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ Copie o token retornado!** Você vai precisar dele para os próximos testes.

---

### 👤 Teste 3: Obter Perfil (Rota Protegida)

**Endpoint:** `GET http://localhost:3000/api/users/profile`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Resposta esperada (200):**
```json
{
  "success": true,
  "message": "Perfil obtido com sucesso",
  "data": {
    "user": {
      "_id": "...",
      "username": "jogador123",
      "email": "jogador@example.com",
      "balance": 0,
      "gamesPlayed": 0,
      "gamesWon": 0,
      "gamesLost": 0,
      "totalEarnings": 0,
      "totalLosses": 0,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 💰 Teste 4: Atualizar Saldo - Adicionar

**Endpoint:** `PATCH http://localhost:3000/api/users/balance`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Body (JSON):**
```json
{
  "amount": 100,
  "operation": "add"
}
```

**Resposta esperada (200):**
```json
{
  "success": true,
  "message": "Saldo atualizado com sucesso",
  "data": {
    "balance": 100,
    "previousBalance": 0,
    "change": 100
  }
}
```

---

### 💸 Teste 5: Atualizar Saldo - Subtrair

**Endpoint:** `PATCH http://localhost:3000/api/users/balance`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Body (JSON):**
```json
{
  "amount": 30,
  "operation": "subtract"
}
```

**Resposta esperada (200):**
```json
{
  "success": true,
  "message": "Saldo atualizado com sucesso",
  "data": {
    "balance": 70,
    "previousBalance": 100,
    "change": -30
  }
}
```

---

### 🏆 Teste 6: Obter Ranking (Rota Pública)

**Endpoint:** `GET http://localhost:3000/api/users/ranking?limit=5&sortBy=gamesWon`

**Sem autenticação necessária!**

**Resposta esperada (200):**
```json
{
  "success": true,
  "message": "Ranking obtido com sucesso",
  "data": {
    "ranking": [
      {
        "_id": "...",
        "username": "jogador123",
        "gamesPlayed": 10,
        "gamesWon": 8,
        "winRate": 80,
        "totalEarnings": 500
      }
    ],
    "total": 1
  }
}
```

---

## 🌐 Passo 3: Testes no Frontend

### 1️⃣ Abrir a Página de Registro

Navegue até: `http://localhost:3000/register`

**Teste de Validação:**
- ❌ Tente enviar o formulário vazio → Deve mostrar erros
- ❌ Tente criar usuário com menos de 3 caracteres → Erro
- ❌ Tente usar email inválido → Erro
- ❌ Tente senhas que não coincidem → Erro
- ❌ Tente enviar sem aceitar os termos → Alerta

**Teste de Registro:**
```
Usuário: meu_usuario
Email: teste@example.com
Senha: senha123
Confirmar Senha: senha123
☑️ Aceitar termos
```

**Resultado esperado:**
- ✅ Token salvo no localStorage
- ✅ Dados do usuário salvos
- ✅ Redirecionamento para `/jogo`

---

### 2️⃣ Abrir o Console do Navegador

Após o registro, abra o console (F12) e execute:

```javascript
// Verificar se está autenticado
ApiService.isAuthenticated(); // true

// Ver dados do usuário
ApiService.getUser();

// Ver o token
ApiService.getToken();

// Obter perfil atualizado
await ApiService.getProfile();

// Adicionar saldo
await ApiService.updateBalance(50, 'add');

// Subtrair saldo
await ApiService.updateBalance(20, 'subtract');

// Obter ranking
await ApiService.getRanking(10, 'totalEarnings');

// Fazer logout
ApiService.logout();
```

---

### 3️⃣ Testar Login

Navegue até: `http://localhost:3000/login`

**Teste de Validação:**
- ❌ Email inválido → Erro
- ❌ Senha curta → Erro
- ❌ Credenciais erradas → Erro do backend

**Teste de Login:**
```
Email: teste@example.com
Senha: senha123
```

**Resultado esperado:**
- ✅ Login bem-sucedido
- ✅ Redirecionamento para `/jogo`

---

## 🔍 Passo 4: Testes de Segurança

### 🛡️ Teste 1: Rota Protegida Sem Token

**Endpoint:** `GET http://localhost:3000/api/users/profile`

**Sem Header Authorization**

**Resposta esperada (401):**
```json
{
  "success": false,
  "message": "Acesso negado. Token não fornecido."
}
```

---

### 🛡️ Teste 2: Token Inválido

**Endpoint:** `GET http://localhost:3000/api/users/profile`

**Headers:**
```
Authorization: Bearer token_invalido_123
```

**Resposta esperada (401):**
```json
{
  "success": false,
  "message": "Token inválido ou expirado"
}
```

---

### 🛡️ Teste 3: Email Duplicado

Tente registrar novamente com o mesmo email:

**Endpoint:** `POST http://localhost:3000/api/users/register`

**Body:**
```json
{
  "username": "outro_usuario",
  "email": "teste@example.com",
  "password": "senha123"
}
```

**Resposta esperada (400):**
```json
{
  "success": false,
  "message": "Email já cadastrado"
}
```

---

### 🛡️ Teste 4: Username Duplicado

**Endpoint:** `POST http://localhost:3000/api/users/register`

**Body:**
```json
{
  "username": "meu_usuario",
  "email": "outro@example.com",
  "password": "senha123"
}
```

**Resposta esperada (400):**
```json
{
  "success": false,
  "message": "Username já cadastrado"
}
```

---

### 🛡️ Teste 5: Validação de Entrada

**Endpoint:** `POST http://localhost:3000/api/users/register`

**Body (dados inválidos):**
```json
{
  "username": "ab",
  "email": "email_invalido",
  "password": "123"
}
```

**Resposta esperada (400):**
```json
{
  "success": false,
  "message": "Erro de validação",
  "errors": [
    "Username deve ter entre 3 e 20 caracteres",
    "Email inválido",
    "Senha deve ter entre 6 e 50 caracteres"
  ]
}
```

---

### 🛡️ Teste 6: Saldo Insuficiente

**Endpoint:** `PATCH http://localhost:3000/api/users/balance`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Body (tentar subtrair mais do que tem):**
```json
{
  "amount": 999999,
  "operation": "subtract"
}
```

**Resposta esperada (400):**
```json
{
  "success": false,
  "message": "Saldo insuficiente"
}
```

---

## 📊 Passo 5: Verificar no MongoDB

### Abrir MongoDB Compass ou Mongo Shell

**Via Mongo Shell:**
```bash
mongosh
use damasonline
db.users.find().pretty()
```

**Verificações:**
- ✅ Senha está hasheada (bcrypt)
- ✅ Campos estão corretos
- ✅ Timestamps estão funcionando

---

## 🎯 Checklist Final

### Backend
- [ ] Servidor rodando sem erros
- [ ] MongoDB conectado
- [ ] Registro funcionando
- [ ] Login funcionando
- [ ] Perfil retornando dados
- [ ] Saldo sendo atualizado
- [ ] Ranking funcionando
- [ ] Validações funcionando
- [ ] Erros sendo tratados corretamente
- [ ] Tokens JWT sendo gerados
- [ ] Rotas protegidas funcionando

### Frontend
- [ ] Página de registro carregando
- [ ] Validações de formulário funcionando
- [ ] Registro enviando dados para API
- [ ] Token sendo salvo no localStorage
- [ ] Redirecionamento após registro
- [ ] Página de login funcionando
- [ ] Login enviando dados para API
- [ ] ApiService funcionando no console
- [ ] Erros sendo exibidos corretamente

### Segurança
- [ ] Senhas hasheadas com bcrypt
- [ ] Tokens JWT válidos e seguros
- [ ] Rotas protegidas bloqueando acesso sem token
- [ ] Validações impedindo dados inválidos
- [ ] Duplicatas sendo detectadas
- [ ] Saldo insuficiente sendo validado

---

## 🐛 Solução de Problemas Comuns

### Erro: "Cannot connect to MongoDB"
```bash
# Verificar se MongoDB está rodando
mongod --version

# Iniciar MongoDB
mongod
```

### Erro: "JWT_SECRET is not defined"
```bash
# Verificar arquivo .env
cat .env

# Criar .env se não existir
cp .env.example .env
```

### Erro: "CORS blocked"
- Verificar se o frontend está na mesma porta
- Adicionar configuração CORS no server.js se necessário

### Erro no console do navegador: "ApiService is not defined"
- Verificar se apiService.js está sendo importado antes de auth.js
- Abrir DevTools → Network → Verificar se o arquivo foi carregado

---

## ✅ Conclusão

Se todos os testes passaram, seu sistema de autenticação está **100% funcional** e pronto para produção! 🎉

**Próximos passos:**
1. Integrar autenticação com o jogo de damas
2. Adicionar sistema de aposta com saldo real
3. Implementar ranking em tempo real
4. Adicionar notificações de vitória/derrota
5. Sistema de histórico de partidas

---

## 📚 Recursos Adicionais

- **API Docs:** `API_DOCS.md`
- **Exemplos de Uso:** `frontend/js/apiService.js` (linhas 180-290)
- **Variáveis de Ambiente:** `.env.example`

