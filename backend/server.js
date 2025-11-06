const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para a página inicial (Landing Page)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota para o jogo
app.get('/jogo', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/game.html'));
});

// Conexão MongoDB
mongoose.connect('mongodb+srv://higorhenry102:Senac2004@api.1hr0gpv.mongodb.net/bcd_dama?retryWrites=true&w=majority&appName=API')
  .then(() => console.log('✅ MongoDB conectado com sucesso'))
  .catch(err => console.error('❌ Erro ao conectar MongoDB:', err.message));

// Armazena jogos ativos
const activeGames = new Map();
const waitingRooms = [];

// Socket.io para tempo real
io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  // Criar sala com aposta
  socket.on('createRoom', (data) => {
    const room = {
      id: `room_${Date.now()}`,
      host: socket.id,
      hostName: data.playerName,
      betAmount: data.betAmount,
      status: 'waiting'
    };
    
    waitingRooms.push(room);
    socket.join(room.id);
    socket.emit('roomCreated', room);
    io.emit('updateRooms', waitingRooms);
  });

  // Entrar em sala
  socket.on('joinRoom', (roomId) => {
    const room = waitingRooms.find(r => r.id === roomId);
    
    if (room && room.status === 'waiting') {
      socket.join(roomId);
      room.guest = socket.id;
      room.status = 'playing';
      
      // Inicializar jogo
      const game = initializeGame(room);
      activeGames.set(roomId, game);
      
      io.to(roomId).emit('gameStart', game);
      
      // Remove da lista de espera
      const index = waitingRooms.indexOf(room);
      waitingRooms.splice(index, 1);
      io.emit('updateRooms', waitingRooms);
    }
  });

  // Movimento de peça
  socket.on('movePiece', (data) => {
    const game = activeGames.get(data.roomId);
    
    if (game && validateMove(game, data.move, socket.id)) {
      const moveResult = applyMove(game.board, data.move);
      game.board = moveResult.board;
      
      // Verificar se pode capturar novamente (captura em sequência)
      const canCaptureAgain = moveResult.wasCapture && 
                               hasAvailableCaptures(game.board, data.move.to, game.currentTurn);
      
      // Só muda o turno se não puder capturar novamente
      if (!canCaptureAgain) {
        game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
        
        // Verificar se o próximo jogador tem movimentos válidos
        const nextPlayerHasMoves = playerHasValidMoves(game.board, game.currentTurn);
        if (!nextPlayerHasMoves) {
          // Jogador sem movimentos = derrota
          const winner = game.currentTurn === 'white' ? 'black' : 'white';
          handleGameEnd(data.roomId, winner);
          return;
        }
      }
      
      io.to(data.roomId).emit('moveMade', {
        board: game.board,
        currentTurn: game.currentTurn,
        mustContinue: canCaptureAgain,
        continuingPiece: canCaptureAgain ? data.move.to : null,
        wasCapture: moveResult.wasCapture
      });
      
      // Verificar vitória por eliminação de peças
      const winner = checkWinner(game.board);
      if (winner) {
        handleGameEnd(data.roomId, winner);
      }
    } else {
      // Enviar erro se movimento inválido
      socket.emit('invalidMove', { message: 'Movimento inválido!' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    handleDisconnect(socket.id);
  });
});

function initializeGame(room) {
  return {
    roomId: room.id,
    players: {
      white: room.host,
      black: room.guest
    },
    betAmount: room.betAmount,
    currentTurn: 'white',
    board: createInitialBoard(),
    escrow: room.betAmount * 2
  };
}

function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Peças pretas (linhas 0-2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', isKing: false };
      }
    }
  }
  
  // Peças brancas (linhas 5-7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'white', isKing: false };
      }
    }
  }
  
  return board;
}

function validateMove(game, move, playerId) {
  const playerColor = game.players.white === playerId ? 'white' : 'black';
  
  // Verificar se é o turno do jogador
  if (game.currentTurn !== playerColor) return false;
  
  const piece = game.board[move.from.row][move.from.col];
  if (!piece || piece.color !== playerColor) return false;
  
  // Verificar se a posição de destino está vazia
  const targetPiece = game.board[move.to.row][move.to.col];
  if (targetPiece) return false;
  
  // REGRA OBRIGATÓRIA: Se há capturas disponíveis, deve capturar
  const availableCaptures = getAllAvailableCaptures(game.board, playerColor);
  const isCapture = isCapturingMove(game.board, move);
  
  if (availableCaptures.length > 0 && !isCapture) {
    return false; // Deve capturar quando possível
  }
  
  const rowDiff = move.to.row - move.from.row;
  const colDiff = move.to.col - move.from.col;
  
  // Movimento deve ser diagonal
  if (Math.abs(colDiff) !== Math.abs(rowDiff)) return false;
  
  const distance = Math.abs(rowDiff);
  
  // PEÇA NORMAL (não é dama)
  if (!piece.isKing) {
    // Peças normais só podem andar 1 ou 2 casas (captura)
    if (distance > 2) return false;
    
    // Movimento simples (1 casa) - apenas para frente
    if (distance === 1) {
      // Verificar direção apenas para movimento simples (não captura)
      if (playerColor === 'white' && rowDiff > 0) return false;
      if (playerColor === 'black' && rowDiff < 0) return false;
      return true;
    }
    
    // Captura (2 casas) - PODE SER PARA TRÁS
    if (distance === 2) {
      const midRow = move.from.row + rowDiff / 2;
      const midCol = move.from.col + colDiff / 2;
      const capturedPiece = game.board[midRow][midCol];
      
      // Deve ter uma peça inimiga no meio
      if (!capturedPiece || capturedPiece.color === playerColor) return false;
      
      return true;
    }
  }
  
  // DAMA (pode mover múltiplas casas)
  if (piece.isKing) {
    // Verificar se o caminho está livre
    const rowStep = rowDiff > 0 ? 1 : -1;
    const colStep = colDiff > 0 ? 1 : -1;
    
    let foundEnemy = false;
    let enemyCount = 0;
    
    for (let i = 1; i < distance; i++) {
      const checkRow = move.from.row + (i * rowStep);
      const checkCol = move.from.col + (i * colStep);
      const checkPiece = game.board[checkRow][checkCol];
      
      if (checkPiece) {
        // Se encontrar peça aliada, movimento inválido
        if (checkPiece.color === playerColor) return false;
        
        // Se encontrar peça inimiga
        enemyCount++;
        if (enemyCount > 1) return false; // Não pode pular mais de 1 peça
        foundEnemy = true;
      }
    }
    
    return true; // Caminho válido para dama
  }
  
  return false;
}

// Verifica se um movimento é uma captura
function isCapturingMove(board, move) {
  const rowDiff = move.to.row - move.from.row;
  const colDiff = move.to.col - move.from.col;
  const distance = Math.abs(rowDiff);
  
  if (distance < 2) return false;
  
  const rowStep = rowDiff > 0 ? 1 : -1;
  const colStep = colDiff > 0 ? 1 : -1;
  
  // Verificar se há alguma peça no caminho
  for (let i = 1; i < distance; i++) {
    const checkRow = move.from.row + (i * rowStep);
    const checkCol = move.from.col + (i * colStep);
    if (board[checkRow][checkCol]) {
      return true;
    }
  }
  
  return false;
}

// Retorna todas as capturas disponíveis para um jogador
function getAllAvailableCaptures(board, playerColor) {
  const captures = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === playerColor) {
        const piecCaptures = getAvailableCapturesForPiece(board, { row, col });
        captures.push(...piecCaptures);
      }
    }
  }
  
  return captures;
}

// Retorna capturas disponíveis para uma peça específica
function getAvailableCapturesForPiece(board, position) {
  const captures = [];
  const piece = board[position.row][position.col];
  if (!piece) return captures;
  
  const directions = [
    { row: -1, col: -1 }, // Nordeste
    { row: -1, col: 1 },  // Noroeste
    { row: 1, col: -1 },  // Sudeste
    { row: 1, col: 1 }    // Sudoeste
  ];
  
  for (const dir of directions) {
    // Peça normal - apenas 2 casas
    if (!piece.isKing) {
      const jumpRow = position.row + (dir.row * 2);
      const jumpCol = position.col + (dir.col * 2);
      const midRow = position.row + dir.row;
      const midCol = position.col + dir.col;
      
      if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
        const midPiece = board[midRow][midCol];
        const destPiece = board[jumpRow][jumpCol];
        
        if (midPiece && midPiece.color !== piece.color && !destPiece) {
          captures.push({ from: position, to: { row: jumpRow, col: jumpCol } });
        }
      }
    } else {
      // Dama - múltiplas casas
      for (let dist = 2; dist < 8; dist++) {
        const jumpRow = position.row + (dir.row * dist);
        const jumpCol = position.col + (dir.col * dist);
        
        if (jumpRow < 0 || jumpRow >= 8 || jumpCol < 0 || jumpCol >= 8) break;
        
        const destPiece = board[jumpRow][jumpCol];
        if (destPiece) break; // Caminho bloqueado
        
        // Verificar se há exatamente 1 peça inimiga no caminho
        let enemyCount = 0;
        let hasAlly = false;
        
        for (let i = 1; i < dist; i++) {
          const checkRow = position.row + (dir.row * i);
          const checkCol = position.col + (dir.col * i);
          const checkPiece = board[checkRow][checkCol];
          
          if (checkPiece) {
            if (checkPiece.color === piece.color) {
              hasAlly = true;
              break;
            } else {
              enemyCount++;
            }
          }
        }
        
        if (!hasAlly && enemyCount === 1) {
          captures.push({ from: position, to: { row: jumpRow, col: jumpCol } });
        }
      }
    }
  }
  
  return captures;
}

// Verifica se há capturas disponíveis a partir de uma posição
function hasAvailableCaptures(board, position, playerColor) {
  const captures = getAvailableCapturesForPiece(board, position);
  return captures.length > 0;
}

// Verifica se um jogador tem pelo menos um movimento válido
function playerHasValidMoves(board, playerColor) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === playerColor) {
        // Verificar movimentos simples
        const directions = [
          { row: -1, col: -1 },
          { row: -1, col: 1 },
          { row: 1, col: -1 },
          { row: 1, col: 1 }
        ];
        
        for (const dir of directions) {
          // Movimento simples
          if (!piece.isKing) {
            const moveRow = row + dir.row;
            const moveCol = col + dir.col;
            
            if (moveRow >= 0 && moveRow < 8 && moveCol >= 0 && moveCol < 8) {
              if (!board[moveRow][moveCol]) {
                // Verificar direção
                if ((piece.color === 'white' && dir.row < 0) || 
                    (piece.color === 'black' && dir.row > 0)) {
                  return true;
                }
              }
            }
          } else {
            // Dama
            for (let dist = 1; dist < 8; dist++) {
              const moveRow = row + (dir.row * dist);
              const moveCol = col + (dir.col * dist);
              
              if (moveRow < 0 || moveRow >= 8 || moveCol < 0 || moveCol >= 8) break;
              
              if (!board[moveRow][moveCol]) {
                return true;
              } else {
                break;
              }
            }
          }
        }
        
        // Verificar capturas
        const captures = getAvailableCapturesForPiece(board, { row, col });
        if (captures.length > 0) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function applyMove(board, move) {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[move.from.row][move.from.col];
  
  // Mover a peça
  newBoard[move.to.row][move.to.col] = piece;
  newBoard[move.from.row][move.from.col] = null;
  
  // Promover a dama quando chegar na última linha
  if ((piece.color === 'white' && move.to.row === 0) ||
      (piece.color === 'black' && move.to.row === 7)) {
    newBoard[move.to.row][move.to.col].isKing = true;
  }
  
  // Captura de peças
  const rowDiff = move.to.row - move.from.row;
  const colDiff = move.to.col - move.from.col;
  const distance = Math.abs(rowDiff);
  
  let wasCapture = false;
  
  // Se moveu mais de 1 casa, é captura
  if (distance > 1) {
    const rowStep = rowDiff > 0 ? 1 : -1;
    const colStep = colDiff > 0 ? 1 : -1;
    
    // Remover todas as peças capturadas no caminho
    for (let i = 1; i < distance; i++) {
      const capturedRow = move.from.row + (i * rowStep);
      const capturedCol = move.from.col + (i * colStep);
      
      if (newBoard[capturedRow][capturedCol]) {
        newBoard[capturedRow][capturedCol] = null;
        wasCapture = true;
      }
    }
  }
  
  return { board: newBoard, wasCapture };
}

function checkWinner(board) {
  let whitePieces = 0;
  let blackPieces = 0;
  
  for (let row of board) {
    for (let cell of row) {
      if (cell) {
        if (cell.color === 'white') whitePieces++;
        else blackPieces++;
      }
    }
  }
  
  if (whitePieces === 0) return 'black';
  if (blackPieces === 0) return 'white';
  return null;
}

function handleGameEnd(roomId, winner) {
  const game = activeGames.get(roomId);
  const winnerId = game.players[winner];
  
  // Transferir escrow para vencedor
  io.to(roomId).emit('gameEnd', {
    winner: winner,
    prize: game.escrow
  });
  
  activeGames.delete(roomId);
}

function handleDisconnect(socketId) {
  // Remover de salas de espera
  const roomIndex = waitingRooms.findIndex(r => r.host === socketId);
  if (roomIndex !== -1) {
    waitingRooms.splice(roomIndex, 1);
    io.emit('updateRooms', waitingRooms);
  }
  
  // Finalizar jogos ativos
  for (let [roomId, game] of activeGames) {
    if (game.players.white === socketId || game.players.black === socketId) {
      const winner = game.players.white === socketId ? 'black' : 'white';
      handleGameEnd(roomId, winner);
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
