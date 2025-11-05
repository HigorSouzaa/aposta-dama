# 🎲 Damas Apostas - Jogo Online P2P

Sistema completo de jogo de damas com apostas peer-to-peer em tempo real.

## 🚀 Tecnologias

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Banco de Dados**: MongoDB + Mongoose
- **Autenticação**: JWT, Bcrypt
- **Tempo Real**: WebSockets (Socket.io)

## 📁 Estrutura do Projeto

```
damas-apostas/
├── frontend/
│   ├── index.html          # Página principal
│   ├── styles.css          # Estilos
│   ├── game.js             # Lógica do jogo (client)
│   └── assets/             # Imagens e recursos
├── backend/
│   ├── server.js           # Servidor principal
│   ├── controllers/
│   │   ├── gameController.js
│   │   └── walletController.js
│   ├── models/
│   │   ├── Game.js
│   │   └── User.js
│   └── routes/
│       ├── gameRoutes.js
│       └── walletRoutes.js
├── package.json
├── .env
└── README.md
```

## 🎮 Funcionalidades

- ✅ Criação de salas com apostas personalizadas
- ✅ Sistema de matchmaking automático
- ✅ Jogo de damas com regras completas
- ✅ Comunicação em tempo real via WebSocket
- ✅ Sistema de carteira virtual
- ✅ Histórico de partidas
- ✅ Escrow automático de apostas
- ✅ Interface responsiva

## 🔧 Instalação

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar MongoDB

Certifique-se de ter o MongoDB instalado e rodando:

```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongodb
```

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env` conforme necessário.

### 4. Iniciar o Servidor

```bash
# Modo desenvolvimento (com nodemon)
npm run dev

# Modo produção
npm start
```

### 5. Acessar a Aplicação

Abra o navegador em: `http://localhost:3000`

## 🎯 Como Jogar

1. **Entrar na Plataforma**
   - Digite seu nome
   - Verifique seu saldo inicial (R$ 100,00)

2. **Criar ou Entrar em uma Sala**
   - Crie uma sala definindo o valor da aposta
   - OU entre em uma sala disponível

3. **Jogar**
   - Clique na peça para selecionar
   - Clique no destino para mover
   - Capture todas as peças do adversário para vencer

4. **Ganhar**
   - O vencedor recebe todo o valor em escrow (aposta × 2)

## 📝 Regras do Jogo

- Peças normais movem-se diagonalmente para frente
- Capturas são obrigatórias quando disponíveis
- Ao chegar na última linha, a peça vira Dama (♔)
- Damas podem mover-se em qualquer diagonal
- Vence quem capturar todas as peças do adversário

## 🔒 Segurança

- Validação de movimentos no servidor
- Sistema de escrow para apostas
- Proteção contra desconexões
- Validação de saldo antes das apostas

## 🚧 Melhorias Futuras

- [ ] Sistema de autenticação completo
- [ ] Integração com gateway de pagamento real
- [ ] Ranking de jogadores
- [ ] Chat em tempo real
- [ ] Replay de partidas
- [ ] Sistema de torneios
- [ ] Modo treino vs IA
- [ ] Proteção anti-fraude avançada

## ⚠️ Avisos Legais

Este é um projeto educacional. Para uso em produção com dinheiro real:

1. Consulte as leis locais sobre jogos de azar
2. Implemente KYC (Know Your Customer)
3. Adicione AML (Anti-Money Laundering)
4. Contrate auditoria de segurança
5. Obtenha licenças necessárias
6. Integre gateway de pagamento certificado

## 📄 Licença

MIT License - Livre para uso educacional

## 👥 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

Desenvolvido com ❤️ para aprendizado
