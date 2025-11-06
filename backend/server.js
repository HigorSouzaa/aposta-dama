const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');

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

// ==================== BOT AI - SERVIDOR ====================
// Cache de posições para otimização (Transposition Table)
const transpositionTable = new Map();
const MAX_CACHE_SIZE = 100000;

// Opening Book - Aberturas clássicas para início de jogo
const openingBook = {
  // Abertura clássica - mover peça central para frente
  'initial_move_1': { from: { row: 2, col: 1 }, to: { row: 3, col: 0 } },
  'initial_move_2': { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } },
  'initial_move_3': { from: { row: 2, col: 3 }, to: { row: 3, col: 2 } },
  'initial_move_4': { from: { row: 2, col: 3 }, to: { row: 3, col: 4 } },
  'initial_move_5': { from: { row: 2, col: 5 }, to: { row: 3, col: 4 } },
  'initial_move_6': { from: { row: 2, col: 5 }, to: { row: 3, col: 6 } },
};

// Gerar hash único para um estado do tabuleiro
function hashBoard(board) {
  const boardString = JSON.stringify(board);
  return crypto.createHash('md5').update(boardString).digest('hex');
}

// Limpar cache se exceder tamanho máximo
function cleanCache() {
  if (transpositionTable.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(transpositionTable.keys()).slice(0, 10000);
    keysToDelete.forEach(key => transpositionTable.delete(key));
    console.log('🧹 Cache limpo:', transpositionTable.size, 'entradas restantes');
  }
}

// ==================== FUNÇÕES AUXILIARES ESTRATÉGICAS ====================

// Verifica se uma peça está protegida por aliada
function isPieceProtected(row, col, piece, board) {
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  
  for (const [dr, dc] of directions) {
    const checkRow = row + dr;
    const checkCol = col + dc;
    
    if (checkRow >= 0 && checkRow < 8 && checkCol >= 0 && checkCol < 8) {
      const ally = board[checkRow][checkCol];
      if (ally && ally.color === piece.color) {
        return true; // Tem peça aliada adjacente
      }
    }
  }
  return false;
}

// Conta mobilidade local de uma peça (quantas casas pode mover)
function countLocalMobility(row, col, piece, board) {
  let moves = 0;
  const directions = piece.isKing 
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === 'white' 
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];
  
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    
    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      if (!board[newRow][newCol]) {
        moves++;
      }
    }
  }
  
  return moves;
}

// Avalia a posição de uma peça no tabuleiro (VERSÃO ESTRATÉGICA AVANÇADA)
function evaluatePiecePosition(row, col, piece, board) {
  let score = 0;
  
  // 1. VALOR BASE (aumentar diferença dama vs peça normal)
  score += piece.isKing ? 70 : 10;
  
  // 2. POSIÇÃO ESTRATÉGICA - Centro vale MUITO mais
  const centerRow = Math.abs(3.5 - row);
  const centerCol = Math.abs(3.5 - col);
  const centerBonus = (7 - (centerRow + centerCol)) * 4; // Aumentado de 2 para 4
  score += centerBonus;
  
  // 3. PEÇAS AVANÇADAS (perto de virar dama)
  if (!piece.isKing) {
    if (piece.color === 'black') {
      // Quanto mais perto da linha 7, maior o bonus
      const advanceBonus = (row * row) * 2; // Crescimento exponencial
      score += advanceBonus;
      
      // MEGA BONUS se está a 1 casa de virar dama
      if (row === 6) score += 50;
    } else {
      const advanceBonus = ((7 - row) * (7 - row)) * 2;
      score += advanceBonus;
      
      if (row === 1) score += 50;
    }
  }
  
  // 4. PROTEÇÃO - peça está protegida por outra?
  const isProtected = isPieceProtected(row, col, piece, board);
  if (isProtected) score += 15;
  
  // 5. CONTROLE DE DIAGONAIS PRINCIPAIS
  if (row === col || row + col === 7) {
    score += 10; // Diagonal principal
  }
  
  // 6. CANTOS E BORDAS
  const isCorner = (row === 0 || row === 7) && (col === 0 || col === 7);
  const isEdge = row === 0 || row === 7 || col === 0 || col === 7;
  
  if (piece.isKing) {
    if (isCorner) score += 8;
    if (isEdge) score += 5;
  } else {
    // Peças normais na borda traseira são defensivas
    if ((piece.color === 'white' && row === 7) ||
        (piece.color === 'black' && row === 0)) {
      score += 5; // Defesa da retaguarda
    }
  }
  
  // 7. MOBILIDADE LOCAL - quantas casas pode mover?
  const localMobility = countLocalMobility(row, col, piece, board);
  score += localMobility * 3;
  
  return score;
}

// Conta mobilidade (número de movimentos possíveis)
function countMobility(board, color) {
  let mobility = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        mobility += getPossibleMovesForPiece(board, row, col, piece).length;
      }
    }
  }
  return mobility;
}

// Avalia o estado completo do tabuleiro (VERSÃO ESTRATÉGICA AVANÇADA)
function evaluateBoard(board, color) {
  let score = 0;
  let myPieces = 0;
  let myKings = 0;
  let enemyPieces = 0;
  let enemyKings = 0;
  const enemyColor = color === 'white' ? 'black' : 'white';
  
  // 1. AVALIAR TODAS AS PEÇAS
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const pieceScore = evaluatePiecePosition(row, col, piece, board);
        if (piece.color === color) {
          score += pieceScore;
          myPieces++;
          if (piece.isKing) myKings++;
        } else {
          score -= pieceScore;
          enemyPieces++;
          if (piece.isKing) enemyKings++;
        }
      }
    }
  }
  
  // 2. VANTAGEM MATERIAL MASSIVA (AUMENTADO)
  const pieceDiff = myPieces - enemyPieces;
  score += pieceDiff * 250; // Aumentado de 150 para 250
  
  const kingDiff = myKings - enemyKings;
  score += kingDiff * 150; // Aumentado de 100 para 150
  
  // 3. MOBILIDADE - Peças que podem mover
  const myMobility = countMobility(board, color);
  const enemyMobility = countMobility(board, enemyColor);
  score += (myMobility - enemyMobility) * 5; // Aumentado de 2 para 5
  
  // 4. CONTROLE DO CENTRO (4 casas centrais)
  const centerControl = evaluateCenterControl(board, color);
  score += centerControl * 15;
  
  // 5. PEÇAS AVANÇADAS (perto de virar dama) (AUMENTADO)
  const advancedPieces = countAdvancedPieces(board, color);
  const enemyAdvanced = countAdvancedPieces(board, enemyColor);
  score += (advancedPieces - enemyAdvanced) * 35; // Aumentado de 25 para 35
  
  // 6. FORMAÇÃO DEFENSIVA (peças na linha de fundo)
  const backRowPieces = countBackRowPieces(board, color);
  score += backRowPieces * 8;
  
  // 7. PEÇAS BLOQUEADAS (não podem mover)
  const myBlocked = countBlockedPieces(board, color);
  const enemyBlocked = countBlockedPieces(board, enemyColor);
  score -= myBlocked * 20; // Penalidade por peças bloqueadas
  score += enemyBlocked * 20; // Bonus por bloquear inimigo
  
  // 8. AMEAÇAS IMEDIATAS (peças que podem ser capturadas) (AUMENTADO)
  const myThreats = countThreatenedPieces(board, color);
  const enemyThreats = countThreatenedPieces(board, enemyColor);
  score -= myThreats * 50; // Aumentado de 30 para 50
  score += enemyThreats * 40; // Aumentado de 25 para 40
  
  // 9. ENDGAME - Se poucas peças, valorizar damas e centro
  const totalPieces = myPieces + enemyPieces;
  if (totalPieces <= 8) {
    score += myKings * 50; // Damas valem MUITO no endgame
    score -= enemyKings * 50;
  }
  
  // 10. VITÓRIA/DERROTA ABSOLUTA
  if (enemyPieces === 0) return 100000;
  if (myPieces === 0) return -100000;
  if (enemyMobility === 0) return 100000; // Inimigo sem movimentos
  if (myMobility === 0) return -100000;
  
  return score;
}

// ==================== FUNÇÕES AUXILIARES DE AVALIAÇÃO ====================

// Avalia controle das 4 casas centrais do tabuleiro
function evaluateCenterControl(board, color) {
  let control = 0;
  const centerSquares = [
    [3, 3], [3, 4],
    [4, 3], [4, 4]
  ];
  
  centerSquares.forEach(([row, col]) => {
    const piece = board[row][col];
    if (piece && piece.color === color) {
      control += piece.isKing ? 2 : 1;
    }
  });
  
  return control;
}

// Conta peças avançadas (perto de virar dama)
function countAdvancedPieces(board, color) {
  let count = 0;
  const advancedRows = color === 'black' ? [5, 6] : [1, 2];
  
  for (let row of advancedRows) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color && !piece.isKing) {
        count++;
      }
    }
  }
  
  return count;
}

// Conta peças defensivas na linha de fundo
function countBackRowPieces(board, color) {
  let count = 0;
  const backRow = color === 'white' ? 7 : 0;
  
  for (let col = 0; col < 8; col++) {
    const piece = board[backRow][col];
    if (piece && piece.color === color && !piece.isKing) {
      count++;
    }
  }
  
  return count;
}

// Conta peças bloqueadas (sem movimentos possíveis)
function countBlockedPieces(board, color) {
  let blocked = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const mobility = countLocalMobility(row, col, piece, board);
        if (mobility === 0) blocked++;
      }
    }
  }
  
  return blocked;
}

// Conta peças ameaçadas (podem ser capturadas)
function countThreatenedPieces(board, color) {
  let threatened = 0;
  const enemyColor = color === 'white' ? 'black' : 'white';
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        // Verificar se alguma peça inimiga pode capturar esta
        if (canBeCaptured(row, col, board, enemyColor)) {
          threatened++;
        }
      }
    }
  }
  
  return threatened;
}

// Verifica se uma posição pode ser capturada por uma cor (VERSÃO COMPLETA COM DAMAS)
function canBeCaptured(row, col, board, byColor) {
  // Verificar todas as peças que podem capturar
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const attacker = board[r][c];
      if (attacker && attacker.color === byColor) {
        // Peça normal
        if (!attacker.isKing) {
          const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
          for (const [dr, dc] of directions) {
            if (r + dr === row && c + dc === col) {
              // Verificar se pode pousar
              const landRow = row + dr;
              const landCol = col + dc;
              if (landRow >= 0 && landRow < 8 && landCol >= 0 && landCol < 8) {
                if (!board[landRow][landCol]) {
                  return true;
                }
              }
            }
          }
        } else {
          // Dama - pode capturar a distância
          const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
          for (const [dr, dc] of directions) {
            let foundTarget = false;
            for (let dist = 1; dist < 7; dist++) {
              const checkRow = r + (dr * dist);
              const checkCol = c + (dc * dist);
              
              if (checkRow < 0 || checkRow >= 8 || checkCol < 0 || checkCol >= 8) break;
              
              if (checkRow === row && checkCol === col) {
                foundTarget = true;
                // Verificar se há espaço para pousar
                for (let landDist = dist + 1; landDist < 8; landDist++) {
                  const landRow = r + (dr * landDist);
                  const landCol = c + (dc * landDist);
                  
                  if (landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) break;
                  
                  if (!board[landRow][landCol]) {
                    return true;
                  } else {
                    break;
                  }
                }
                break;
              }
              
              if (board[checkRow][checkCol]) break; // Caminho bloqueado
            }
          }
        }
      }
    }
  }
  
  return false;
}

// Encontra todos os movimentos possíveis para uma cor
function getAllPossibleMoves(board, color) {
  const moves = [];
  const captures = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const pieceMoves = getPossibleMovesForPiece(board, row, col, piece);
        pieceMoves.forEach(move => {
          const moveData = {
            from: { row, col },
            to: move.to,
            captures: move.captures || [],
            score: 0
          };
          
          if (move.captures && move.captures.length > 0) {
            captures.push(moveData);
          } else {
            moves.push(moveData);
          }
        });
      }
    }
  }
  
  // Capturas têm prioridade (regra obrigatória)
  return captures.length > 0 ? captures : moves;
}

// Obtém movimentos possíveis para uma peça específica
function getPossibleMovesForPiece(board, row, col, piece) {
  const moves = [];
  
  // Verificar capturas primeiro (são obrigatórias)
  const captures = findCaptures(board, row, col, piece);
  if (captures.length > 0) {
    return captures.map(c => ({ to: c.to, captures: c.captures }));
  }
  
  // Movimentos normais
  if (piece.isKing) {
    // Dama pode mover em todas as diagonais
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    directions.forEach(([dr, dc]) => {
      let newRow = row + dr;
      let newCol = col + dc;
      while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        if (!board[newRow][newCol]) {
          moves.push({ to: { row: newRow, col: newCol } });
        } else {
          break;
        }
        newRow += dr;
        newCol += dc;
      }
    });
  } else {
    // Peça normal
    const direction = piece.color === 'white' ? -1 : 1;
    const possibleMoves = [
      [row + direction, col - 1],
      [row + direction, col + 1]
    ];
    
    possibleMoves.forEach(([newRow, newCol]) => {
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 && !board[newRow][newCol]) {
        moves.push({ to: { row: newRow, col: newCol } });
      }
    });
  }
  
  return moves;
}

// Encontra capturas possíveis
function findCaptures(board, row, col, piece) {
  const captures = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  
  directions.forEach(([dr, dc]) => {
    let enemyRow = row + dr;
    let enemyCol = col + dc;
    let landRow = row + dr * 2;
    let landCol = col + dc * 2;
    
    if (landRow >= 0 && landRow < 8 && landCol >= 0 && landCol < 8) {
      const enemy = board[enemyRow]?.[enemyCol];
      const land = board[landRow]?.[landCol];
      
      if (enemy && enemy.color !== piece.color && !land) {
        captures.push({
          to: { row: landRow, col: landCol },
          captures: [{ row: enemyRow, col: enemyCol }]
        });
      }
    }
  });
  
  return captures;
}

// Simula um movimento no tabuleiro
function simulateMove(board, move) {
  const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null));
  const piece = newBoard[move.from.row][move.from.col];
  
  if (!piece) return newBoard;
  
  // Remove peça da posição original
  newBoard[move.from.row][move.from.col] = null;
  
  // Remove peças capturadas
  if (move.captures) {
    move.captures.forEach(capture => {
      newBoard[capture.row][capture.col] = null;
    });
  }
  
  // Coloca peça na nova posição
  newBoard[move.to.row][move.to.col] = piece;
  
  // Promove a dama se necessário
  if (!piece.isKing) {
    if ((piece.color === 'white' && move.to.row === 0) || 
        (piece.color === 'black' && move.to.row === 7)) {
      newBoard[move.to.row][move.to.col].isKing = true;
    }
  }
  
  return newBoard;
}

// Minimax com poda Alpha-Beta e Transposition Table
function minimax(board, depth, alpha, beta, maximizingPlayer, color, useCache = true) {
  // Verificar cache
  const boardHash = useCache ? hashBoard(board) : null;
  if (useCache && boardHash && transpositionTable.has(boardHash)) {
    const cached = transpositionTable.get(boardHash);
    if (cached.depth >= depth) {
      return cached.score;
    }
  }
  
  if (depth === 0) {
    const score = evaluateBoard(board, color);
    if (useCache && boardHash) {
      transpositionTable.set(boardHash, { score, depth: 0 });
      cleanCache();
    }
    return score;
  }
  
  const currentColor = maximizingPlayer ? color : (color === 'white' ? 'black' : 'white');
  let moves = getAllPossibleMoves(board, currentColor);
  
  if (moves.length === 0) {
    const score = maximizingPlayer ? -10000 : 10000;
    if (useCache && boardHash) {
      transpositionTable.set(boardHash, { score, depth });
    }
    return score;
  }
  
  // Ordenar movimentos (capturas primeiro, depois por valor estimado)
  moves.sort((a, b) => {
    const captureBonus = (b.captures?.length || 0) - (a.captures?.length || 0);
    if (captureBonus !== 0) return captureBonus * 100;
    return 0;
  });
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(board, move);
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, color, useCache);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Poda
    }
    
    if (useCache && boardHash) {
      transpositionTable.set(boardHash, { score: maxEval, depth });
      cleanCache();
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(board, move);
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, color, useCache);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Poda
    }
    
    if (useCache && boardHash) {
      transpositionTable.set(boardHash, { score: minEval, depth });
      cleanCache();
    }
    return minEval;
  }
}

// Conta total de peças no tabuleiro
function countTotalPieces(board) {
  let count = 0;
  for (let row of board) {
    for (let cell of row) {
      if (cell) count++;
    }
  }
  return count;
}

// NOVA FUNÇÃO: Quiescence Search - continua buscando em capturas
function quiescenceSearch(board, alpha, beta, color, startTime, maxTime, maxQDepth = 6) {
  if (Date.now() - startTime > maxTime || maxQDepth <= 0) {
    return evaluateBoard(board, color);
  }
  
  const standPat = evaluateBoard(board, color);
  
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  
  // Apenas avaliar capturas (posições táticas)
  const allMoves = getAllPossibleMoves(board, color);
  const captures = allMoves.filter(m => m.captures && m.captures.length > 0);
  
  if (captures.length === 0) {
    return standPat; // Posição quieta
  }
  
  for (const move of captures) {
    if (Date.now() - startTime > maxTime) return standPat;
    
    const newBoard = simulateMove(board, move);
    const score = -quiescenceSearch(newBoard, -beta, -alpha, color === 'white' ? 'black' : 'white', startTime, maxTime, maxQDepth - 1);
    
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  
  return alpha;
}

// Minimax Iterativo com Timeout e Quiescence Search
function minimaxIterative(board, depth, alpha, beta, maximizingPlayer, color, startTime, maxTime) {
  // Timeout check
  if (Date.now() - startTime > maxTime) {
    return null; // Sinaliza timeout
  }
  
  // Cache check
  const boardHash = hashBoard(board);
  if (transpositionTable.has(boardHash)) {
    const cached = transpositionTable.get(boardHash);
    if (cached.depth >= depth) {
      return cached.score;
    }
  }
  
  // QUIESCENCE SEARCH - se depth 0 MAS posição instável (capturas), continuar buscando
  if (depth === 0) {
    return quiescenceSearch(board, alpha, beta, color, startTime, maxTime);
  }
  
  const currentColor = maximizingPlayer ? color : (color === 'white' ? 'black' : 'white');
  let moves = getAllPossibleMoves(board, currentColor);
  
  if (moves.length === 0) {
    const score = maximizingPlayer ? -100000 : 100000;
    transpositionTable.set(boardHash, { score, depth });
    return score;
  }
  
  // Move ordering
  moves.sort((a, b) => {
    const captureA = a.captures?.length || 0;
    const captureB = b.captures?.length || 0;
    return captureB - captureA;
  });
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      if (Date.now() - startTime > maxTime) return null;
      
      const newBoard = simulateMove(board, move);
      const evaluation = minimaxIterative(newBoard, depth - 1, alpha, beta, false, color, startTime, maxTime);
      
      if (evaluation === null) return null; // Timeout propagation
      
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    
    transpositionTable.set(boardHash, { score: maxEval, depth });
    cleanCache();
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      if (Date.now() - startTime > maxTime) return null;
      
      const newBoard = simulateMove(board, move);
      const evaluation = minimaxIterative(newBoard, depth - 1, alpha, beta, true, color, startTime, maxTime);
      
      if (evaluation === null) return null;
      
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    
    transpositionTable.set(boardHash, { score: minEval, depth });
    cleanCache();
    return minEval;
  }
}

// Escolhe o melhor movimento para o bot (BUSCA ITERATIVA - MUITO FORTE)
function getBotMove(board, color, difficulty) {
  const startTime = Date.now();
  const MAX_TIME = difficulty === 'expert' ? 5000 :  // 5 segundos
                   difficulty === 'hard' ? 3000 :     // 3 segundos
                   difficulty === 'medium' ? 2000 :   // 2 segundos
                   1000;                              // 1 segundo
  
  console.log(`🤖 Bot calculando movimento (${difficulty}, max ${MAX_TIME}ms)...`);
  
  let moves = getAllPossibleMoves(board, color);
  if (moves.length === 0) {
    console.log('❌ Bot não tem movimentos válidos');
    return null;
  }
  
  // VERIFICAR SE É COMEÇO DO JOGO (opening book)
  const totalPieces = countTotalPieces(board);
  if (totalPieces >= 22) { // Primeiras jogadas
    const bookMoves = Object.values(openingBook);
    const validBookMoves = bookMoves.filter(bookMove =>
      moves.some(m =>
        m.from.row === bookMove.from.row &&
        m.from.col === bookMove.from.col &&
        m.to.row === bookMove.to.row &&
        m.to.col === bookMove.to.col
      )
    );
    
    if (validBookMoves.length > 0) {
      const chosenMove = validBookMoves[Math.floor(Math.random() * validBookMoves.length)];
      console.log('📚 Usando movimento do Opening Book!');
      return moves.find(m =>
        m.from.row === chosenMove.from.row &&
        m.from.col === chosenMove.from.col &&
        m.to.row === chosenMove.to.row &&
        m.to.col === chosenMove.to.col
      );
    }
  }
  
  // Randomness para níveis baixos
  const randomness = difficulty === 'easy' ? 0.25 :
                     difficulty === 'medium' ? 0.1 : 0;
  
  if (Math.random() < randomness) {
    console.log('🎲 Movimento aleatório (baixa dificuldade)');
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  // ORDENAÇÃO INICIAL MELHORADA
  moves.forEach(move => {
    const newBoard = simulateMove(board, move);
    move.quickScore = evaluateBoard(newBoard, color);
  });
  
  moves.sort((a, b) => {
    const captureA = a.captures?.length || 0;
    const captureB = b.captures?.length || 0;
    if (captureA !== captureB) return captureB - captureA;
    return b.quickScore - a.quickScore;
  });
  
  // BUSCA ITERATIVA - começar com profundidade 1, ir aumentando
  let bestMove = moves[0]; // Fallback
  let bestScore = -Infinity;
  let currentDepth = 1;
  const maxDepth = difficulty === 'expert' ? 20 :    // Aumentado!
                   difficulty === 'hard' ? 12 :
                   difficulty === 'medium' ? 8 : 5;
  
  console.log(`🔍 Busca Iterativa até profundidade ${maxDepth}...`);
  
  while (currentDepth <= maxDepth) {
    const depthStartTime = Date.now();
    
    // Se já gastou muito tempo, parar
    if (Date.now() - startTime > MAX_TIME) {
      console.log(`⏰ Tempo limite atingido em profundidade ${currentDepth - 1}`);
      break;
    }
    
    console.log(`  📊 Avaliando profundidade ${currentDepth}...`);
    
    let depthBestMove = null;
    let depthBestScore = -Infinity;
    
    // Avaliar TOP movimentos
    const movesToEval = Math.min(moves.length, currentDepth >= 8 ? 15 : 20);
    
    for (let i = 0; i < movesToEval; i++) {
      // Timeout check
      if (Date.now() - startTime > MAX_TIME) break;
      
      const move = moves[i];
      const newBoard = simulateMove(board, move);
      
      // Minimax com timeout
      const score = minimaxIterative(
        newBoard,
        currentDepth - 1,
        -Infinity,
        Infinity,
        false,
        color,
        startTime,
        MAX_TIME
      );
      
      if (score === null) break; // Timeout
      
      // Bonus para capturas
      const finalScore = score + (move.captures?.length || 0) * 80;
      move.score = finalScore;
      
      if (finalScore > depthBestScore) {
        depthBestScore = finalScore;
        depthBestMove = move;
      }
    }
    
    // Se completou essa profundidade, atualizar melhor movimento
    if (depthBestMove) {
      bestMove = depthBestMove;
      bestScore = depthBestScore;
      
      const depthTime = Date.now() - depthStartTime;
      console.log(`    ✓ Profundidade ${currentDepth} completada (${depthTime}ms, score: ${bestScore})`);
    }
    
    currentDepth++;
  }
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ MELHOR MOVIMENTO (profundidade ${currentDepth - 1}):`);
  console.log(`   From: (${bestMove.from.row}, ${bestMove.from.col})`);
  console.log(`   To: (${bestMove.to.row}, ${bestMove.to.col})`);
  console.log(`   Score: ${bestScore}`);
  console.log(`   Tempo total: ${elapsed}ms`);
  console.log(`   Cache: ${transpositionTable.size} posições`);
  
  return bestMove;
}

// ==================== FIM BOT AI ====================


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

// Rota para login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

// Rota para registro
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
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
      name: data.roomName || `Mesa de ${data.playerName}`,
      betAmount: data.betAmount,
      gameMode: data.gameMode || 'competitive',
      timeLimit: data.timeLimit || 300,
      isPrivate: data.isPrivate || false,
      allowSpectators: data.allowSpectators !== false,
      players: 1,
      status: 'waiting'
    };
    
    waitingRooms.push(room);
    socket.join(room.id);
    socket.emit('roomCreated', room);
    io.emit('updateRooms', waitingRooms);
  });
  
  // Criar jogo contra BOT
  socket.on('createBotGame', async (data) => {
    const roomId = `bot_${Date.now()}`;
    const room = {
      id: roomId,
      host: socket.id,
      hostName: data.playerName,
      betAmount: data.betAmount,
      difficulty: data.difficulty || 'medium',
      timeLimit: data.timeLimit || 60,
      isBot: true,
      status: 'playing'
    };
    
    socket.join(roomId);
    
    // Inicializar jogo contra bot
    const game = initializeGame(room);
    game.isBot = true;
    game.botDifficulty = data.difficulty;
    activeGames.set(roomId, game);
    
    socket.emit('gameStart', game);
    console.log(`🤖 Jogo contra BOT criado: ${roomId}`);
    console.log(`   Dificuldade: ${data.difficulty}`);
    console.log(`   Quem começa: ${game.currentTurn}`);
    
    // Se o bot foi sorteado para começar, fazer primeiro movimento
    if (game.currentTurn === 'black') {
      console.log('🤖 Bot foi sorteado para começar!');
      
      const thinkingTime = game.botDifficulty === 'easy' ? 800 : 
                          game.botDifficulty === 'medium' ? 1200 :
                          game.botDifficulty === 'hard' ? 1800 : 2500;
      
      setTimeout(async () => {
        const botMove = getBotMove(game.board, 'black', game.botDifficulty);
        
        if (botMove) {
          console.log('🤖 Bot fazendo primeiro movimento');
          const moveResult = applyMove(game.board, botMove);
          game.board = moveResult.board;
          game.currentTurn = 'white';
          
          io.to(roomId).emit('moveMade', {
            board: game.board,
            currentTurn: game.currentTurn,
            mustContinue: false,
            continuingPiece: null,
            wasCapture: moveResult.wasCapture
          });
        }
      }, thinkingTime);
    }
  });

  // Entrar em sala
  socket.on('joinRoom', (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const playerName = typeof data === 'string' ? 'Jogador' : (data.playerName || 'Jogador');
    
    const room = waitingRooms.find(r => r.id === roomId);
    
    if (room && room.status === 'waiting') {
      socket.join(roomId);
      room.guest = socket.id;
      room.guestName = playerName;
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

  // Movimento de peça - REESCRITO para suportar bot no servidor
  socket.on('movePiece', async (data) => {
    const game = activeGames.get(data.roomId);
    
    if (!game) {
      console.log('❌ Jogo não encontrado:', data.roomId);
      return;
    }
    
    console.log('📥 Movimento recebido:', {
      roomId: data.roomId,
      from: data.move.from,
      to: data.move.to,
      playerId: socket.id,
      isBot: game.isBot,
      currentTurn: game.currentTurn
    });
    
    // Processar movimento do jogador
    if (validateMove(game, data.move, socket.id)) {
      await processMove(game, data.move, data.roomId, false);
      
      // Se for jogo contra bot e agora é turno do bot, processar automaticamente
      if (game.isBot && game.currentTurn === 'black') {
        console.log('🤖 Turno do bot detectado, processando movimento...');
        
        // Delay baseado na dificuldade
        const thinkingTime = game.botDifficulty === 'easy' ? 500 : 
                            game.botDifficulty === 'medium' ? 1000 :
                            game.botDifficulty === 'hard' ? 1500 : 2000;
        
        setTimeout(async () => {
          const botMove = getBotMove(game.board, 'black', game.botDifficulty);
          
          if (botMove) {
            console.log('🤖 Bot executando movimento:', botMove);
            await processMove(game, botMove, data.roomId, true);
          } else {
            console.log('❌ Bot não tem movimentos - fim de jogo');
            handleGameEnd(data.roomId, 'white');
          }
        }, thinkingTime);
      }
    } else {
      console.log('❌ Movimento inválido!');
      socket.emit('invalidMove', { message: 'Movimento inválido!' });
    }
  });

  // Função auxiliar para processar movimento (jogador ou bot)
  async function processMove(game, move, roomId, isBot) {
    const moveResult = applyMove(game.board, move);
    game.board = moveResult.board;
    
    // Verificar se pode capturar novamente (captura em sequência)
    const canCaptureAgain = moveResult.wasCapture && 
                             hasAvailableCaptures(game.board, move.to, game.currentTurn);
    
    // Só muda o turno se não puder capturar novamente
    if (!canCaptureAgain) {
      game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
      
      // Verificar se o próximo jogador tem movimentos válidos
      const nextPlayerHasMoves = playerHasValidMoves(game.board, game.currentTurn);
      if (!nextPlayerHasMoves) {
        // Jogador sem movimentos = derrota
        const winner = game.currentTurn === 'white' ? 'black' : 'white';
        console.log(`🏁 Fim de jogo! Vencedor: ${winner} (sem movimentos válidos)`);
        handleGameEnd(roomId, winner);
        return;
      }
    }
    
    const logPrefix = isBot ? '🤖' : '👤';
    console.log(`${logPrefix} Movimento processado! Emitindo moveMade para sala:`, roomId);
    
    io.to(roomId).emit('moveMade', {
      board: game.board,
      currentTurn: game.currentTurn,
      mustContinue: canCaptureAgain,
      continuingPiece: canCaptureAgain ? move.to : null,
      wasCapture: moveResult.wasCapture
    });
    
    // Verificar vitória por eliminação de peças
    const winner = checkWinner(game.board);
    if (winner) {
      console.log(`🏁 Fim de jogo! Vencedor: ${winner} (eliminação de peças)`);
      handleGameEnd(roomId, winner);
    }
    
    // Se ainda for turno do bot E pode capturar novamente, processar próxima captura
    if (canCaptureAgain && game.isBot && game.currentTurn === 'black') {
      console.log('🤖 Bot pode capturar novamente...');
      
      setTimeout(async () => {
        const nextBotMove = getBotMove(game.board, 'black', game.botDifficulty);
        if (nextBotMove) {
          console.log('🤖 Bot continuando captura:', nextBotMove);
          await processMove(game, nextBotMove, roomId, true);
        }
      }, 800); // Delay menor para capturas em sequência
    }
  }

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    handleDisconnect(socket.id);
  });
});

function initializeGame(room) {
  // Sortear quem começa (50% de chance para cada)
  const whoStarts = Math.random() < 0.5 ? 'white' : 'black';
  
  return {
    id: room.id,
    roomId: room.id,
    players: {
      white: room.host,
      black: room.isBot ? 'BOT' : room.guest
    },
    betAmount: room.betAmount,
    currentTurn: whoStarts,
    board: createInitialBoard(),
    escrow: room.betAmount * 2,
    isBot: room.isBot || false,
    botDifficulty: room.difficulty || 'medium',
    timeLimit: room.timeLimit || 60
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
  // Se for jogo contra bot e o movimento é do bot
  let playerColor;
  if (game.isBot && game.currentTurn === 'black') {
    playerColor = 'black';
  } else {
    playerColor = game.players.white === playerId ? 'white' : 'black';
  }
  
  // Verificar se é o turno do jogador
  if (game.currentTurn !== playerColor) {
    console.log('❌ Turno errado. Esperado:', game.currentTurn, 'Jogador:', playerColor);
    return false;
  }
  
  const piece = game.board[move.from.row][move.from.col];
  if (!piece || piece.color !== playerColor) {
    console.log('❌ Peça inválida ou cor errada');
    return false;
  }
  
  // Verificar se a posição de destino está vazia
  const targetPiece = game.board[move.to.row][move.to.col];
  if (targetPiece) {
    console.log('❌ Destino ocupado');
    return false;
  }
  
  // REGRA OBRIGATÓRIA: Se há capturas disponíveis, deve capturar
  const availableCaptures = getAllAvailableCaptures(game.board, playerColor);
  const isCapture = isCapturingMove(game.board, move);
  
  if (availableCaptures.length > 0 && !isCapture) {
    console.log('❌ Deve capturar quando possível');
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
