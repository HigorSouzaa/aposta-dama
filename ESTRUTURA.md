# 🎮 Estrutura do Projeto Damas Apostas

## 📁 Organização de Pastas

```
aposta-dama/
├── backend/                    # Servidor Node.js
│   ├── server.js              # Servidor principal
│   ├── controllers/           # Lógica do negócio
│   ├── models/                # Modelos MongoDB
│   └── routes/                # Rotas da API
│
├── frontend/                   # Todo o frontend aqui
│   ├── pages/                 # Páginas do site
│   │   └── index.html        # 🏠 Página inicial (HOME)
│   ├── css/                   # Estilos
│   │   ├── home.css          # Estilos da home
│   │   └── (outros CSS)
│   ├── js/                    # Scripts
│   │   ├── home.js           # Scripts da home
│   │   └── (outros JS)
│   ├── assets/                # Recursos (sons, imagens)
│   ├── index.html            # 🎮 Tela do jogo
│   ├── game.js               # Lógica do jogo
│   └── styles.css            # Estilos do jogo
│
├── package.json               # Dependências
├── .env                       # Variáveis de ambiente
└── README.md                  # Documentação
```

## 🌐 Rotas do Servidor

### Páginas

- **`/`** → Página inicial (Landing Page)
- **`/jogo`** → Aplicação do jogo de damas

### API

- **WebSocket** → Comunicação em tempo real do jogo
- Socket.io na porta **3000**

## 🎨 Páginas Criadas

### 1. **Página Inicial** (`pages/index.html`)
Landing page moderna com:
- ✅ Header com navegação
- ✅ Hero section com call-to-action
- ✅ Seção "Por que jogar conosco?"
- ✅ Seção "Como Funciona"
- ✅ Lobbies ativos em tempo real
- ✅ Footer com links
- ✅ Design responsivo (mobile-first)
- ✅ Tema dark moderno
- ✅ Ícones do Material Symbols

### 2. **Aplicação do Jogo** (`frontend/index.html`)
Interface do jogo de damas com:
- ✅ Sistema de apostas P2P
- ✅ Jogo em tempo real
- ✅ Sons e notificações
- ✅ Regras oficiais de damas

## 🚀 Como Usar

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar servidor
```bash
npm start
```

### 3. Acessar

- **Página Inicial**: http://localhost:3000
- **Jogo**: http://localhost:3000/jogo

## 📝 Próximos Passos

### Páginas a Adicionar

- [ ] **Login** (`pages/login.html`)
- [ ] **Registro** (`pages/register.html`)
- [ ] **Dashboard** (`pages/dashboard.html`)
- [ ] **Perfil** (`pages/profile.html`)
- [ ] **Histórico** (`pages/history.html`)
- [ ] **Ranking** (`pages/ranking.html`)
- [ ] **Torneios** (`pages/tournaments.html`)

### Recursos a Implementar

- [ ] Sistema de autenticação completo
- [ ] Integração com gateway de pagamento
- [ ] Sistema de ranking
- [ ] Chat em tempo real
- [ ] Notificações push
- [ ] Replays de partidas
- [ ] Sistema de conquistas
- [ ] Modo treino vs IA

## 🎨 Design System

### Cores Principais
- **Primary**: `#667eea` (Roxo azulado)
- **Background Dark**: `#101622` (Preto azulado)
- **Background Light**: `#f6f6f8` (Branco gelo)

### Tipografia
- **Fonte**: Manrope (Google Fonts)
- **Pesos**: 400, 500, 700, 800

### Ícones
- **Material Symbols Outlined** (Google)

## 📱 Responsividade

Breakpoints Tailwind CSS:
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px

## 🔧 Tecnologias

### Frontend
- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (Vanilla)
- Socket.io Client

### Backend
- Node.js
- Express
- Socket.io
- MongoDB + Mongoose

## 📄 Licença

MIT License - Projeto educacional

---

**Desenvolvido com ❤️ para aprendizado**
