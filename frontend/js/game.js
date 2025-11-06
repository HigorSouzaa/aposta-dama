const socket = io();

let currentRoom = null;
let selectedPiece = null;
let gameBoard = null;
let playerColor = null;
let currentTurn = null;
let mustContinueCapture = false;
let continuingPiece = null;
let isPlayingAgainstBot = false;
let botDifficulty = 'medium';

// Timer
let turnTimeLimit = 60; // segundos
let currentTimer = 0;
let timerInterval = null;
let player1TimerElement = null;
let player2TimerElement = null;

// Elementos DOM
const lobbyScreen = document.getElementById('lobby');
const createRoomScreen = document.getElementById('createRoom');
const gameScreen = document.getElementById('game');
const resultScreen = document.getElementById('result');
const playerNameInput = document.getElementById('playerName');
const roomNameInput = document.getElementById('roomName');
const botDifficultySelect = document.getElementById('botDifficulty');
const betAmountInput = document.getElementById('betAmount');
const gameModeSelect = document.getElementById('gameMode');
const timeLimitSelect = document.getElementById('timeLimit');
const roomPrivacySelect = document.getElementById('roomPrivacy');
const allowSpectatorsCheckbox = document.getElementById('allowSpectators');
const createRoomBtn = document.getElementById('createRoomBtn');
const confirmCreateRoomBtn = document.getElementById('confirmCreateRoomBtn');
const backToLobbyFromCreate = document.getElementById('backToLobbyFromCreate');
const roomsList = document.getElementById('roomsList');
const boardElement = document.getElementById('board');
const currentTurnElement = document.getElementById('currentTurn');
const gameBetElement = document.getElementById('gameBet');
const leaveGameBtn = document.getElementById('leaveGameBtn');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');
const resultMessage = document.getElementById('resultMessage');
const prizeMessage = document.getElementById('prizeMessage');
const balanceElement = document.getElementById('balance');

// Elementos de preview
const previewRoomName = document.getElementById('previewRoomName');
const previewMode = document.getElementById('previewMode');
const previewBet = document.getElementById('previewBet');
const previewTime = document.getElementById('previewTime');

// Saldo inicial (simulado)
let balance = 100.00;

// Inicializar saldo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  updateBalance();
  
  // Inicializar elementos do timer
  player1TimerElement = document.getElementById('player1Timer');
  player2TimerElement = document.getElementById('player2Timer');
});

// Atualizar imediatamente também (caso DOMContentLoaded já tenha ocorrido)
updateBalance();

// Seletor de tipo de jogo (PvP vs Bot)
document.addEventListener('DOMContentLoaded', () => {
  const gameTypeBtns = document.querySelectorAll('.game-type-btn');
  const roomNameGroup = document.getElementById('roomNameGroup');
  const botDifficultyGroup = document.getElementById('botDifficultyGroup');
  
  gameTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active de todos
      gameTypeBtns.forEach(b => b.classList.remove('active'));
      // Adiciona active no clicado
      btn.classList.add('active');
      
      const gameType = btn.dataset.type;
      isPlayingAgainstBot = gameType === 'bot';
      
      // Mostra/esconde campos apropriados
      if (isPlayingAgainstBot) {
        roomNameGroup.style.display = 'none';
        botDifficultyGroup.style.display = 'block';
      } else {
        roomNameGroup.style.display = 'block';
        botDifficultyGroup.style.display = 'none';
      }
    });
  });
});

// Navegação entre telas
createRoomBtn.addEventListener('click', () => {
  showScreen('createRoom');
});

backToLobbyFromCreate.addEventListener('click', () => {
  showScreen('lobby');
});

// Preview da sala em tempo real
roomNameInput?.addEventListener('input', (e) => {
  const name = e.target.value.trim() || 'Mesa do Campeão';
  if (previewRoomName) previewRoomName.textContent = name;
});

betAmountInput?.addEventListener('input', (e) => {
  const bet = parseFloat(e.target.value) || 50;
  if (previewBet) previewBet.textContent = `R$ ${bet.toFixed(2)}`;
});

gameModeSelect?.addEventListener('change', (e) => {
  const mode = e.target.value === 'competitive' ? 'Competitivo' : 'Casual';
  if (previewMode) previewMode.textContent = mode;
});

timeLimitSelect?.addEventListener('change', (e) => {
  const time = parseInt(e.target.value);
  let timeText = '';
  if (time < 60) timeText = `${time} seg`;
  else if (time < 3600) timeText = `${time / 60} min`;
  else timeText = `${time / 3600} h`;
  if (previewTime) previewTime.textContent = timeText;
});

// Criar sala (confirmação)
confirmCreateRoomBtn?.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const betAmount = parseFloat(betAmountInput.value);
  
  if (!playerName) {
    alert('Digite seu nome!');
    return;
  }
  
  if (!betAmount || betAmount <= 0 || betAmount > balance) {
    alert('Valor de aposta inválido!');
    return;
  }
  
  if (isPlayingAgainstBot) {
    // Jogar contra bot
    botDifficulty = botDifficultySelect.value;
    socket.emit('createBotGame', { 
      playerName, 
      betAmount,
      difficulty: botDifficulty
    });
  } else {
    // Jogar PvP
    const roomName = roomNameInput.value.trim() || 'Mesa do Campeão';
    const gameMode = gameModeSelect.value;
    const timeLimit = parseInt(timeLimitSelect.value);
    const isPrivate = roomPrivacySelect.value === 'private';
    const allowSpectators = allowSpectatorsCheckbox.checked;
    
    socket.emit('createRoom', { 
      playerName, 
      roomName,
      betAmount,
      gameMode,
      timeLimit,
      isPrivate,
      allowSpectators
    });
  }
  
  showScreen('lobby');
});

// Socket events
socket.on('roomCreated', (room) => {
  currentRoom = room.id;
  playerColor = 'white';
  alert('Sala criada! Aguardando outro jogador...');
});

socket.on('updateRooms', (rooms) => {
  roomsList.innerHTML = '';
  
  if (rooms.length === 0) {
    roomsList.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--gray-400);">
        <p>Nenhuma sala disponível no momento.</p>
        <p style="font-size: 0.875rem; margin-top: 0.5rem;">Seja o primeiro a criar uma sala!</p>
      </div>
    `;
    return;
  }
  
  rooms.forEach(room => {
    const isFull = room.players >= 2;
    const roomDiv = document.createElement('div');
    roomDiv.className = 'room-item';
    roomDiv.innerHTML = `
      <div class="room-name">${room.name || room.hostName}</div>
      <div class="room-bet">R$ ${room.betAmount.toFixed(2)}</div>
      <div class="room-players ${isFull ? 'full' : ''}">${room.players || 1}/2</div>
      <div class="room-time">${formatTime(room.timeLimit || 300)}</div>
      <button class="btn-enter-room" onclick="joinRoom('${room.id}')" ${isFull ? 'disabled' : ''}>
        ${isFull ? 'Cheia' : 'Entrar'}
      </button>
    `;
    roomsList.appendChild(roomDiv);
  });
});

function formatTime(seconds) {
  if (seconds < 60) return `${seconds} seg`;
  if (seconds < 3600) return `${seconds / 60} min`;
  return `${seconds / 3600} h`;
}

function joinRoom(roomId) {
  const playerName = playerNameInput.value.trim();
  
  if (!playerName) {
    alert('Digite seu nome!');
    return;
  }
  
  currentRoom = roomId;
  playerColor = 'black';
  socket.emit('joinRoom', roomId);
}

socket.on('gameStart', (game) => {
  gameBoard = game.board;
  currentTurn = game.currentTurn || 'white';
  currentRoom = game.id || game.roomId;
  
  // Configurar tempo de turno
  turnTimeLimit = game.timeLimit || 60;
  console.log(`⏰ Tempo por turno: ${turnTimeLimit} segundos`);
  
  // Verificar se é jogo contra bot
  if (game.isBot) {
    isPlayingAgainstBot = true;
    botDifficulty = game.botDifficulty || 'medium';
    playerColor = 'white'; // Jogador sempre é branco contra bot
    console.log(`🤖 Iniciando jogo contra BOT (${botDifficulty})`);
    console.log(`🎲 Sorteio: ${currentTurn === 'white' ? 'Você começa!' : 'BOT começa!'}`);
  } else {
    isPlayingAgainstBot = false;
  }
  
  gameBetElement.textContent = (game.betAmount * 2).toFixed(2);
  
  // Ativar áudio context com interação do usuário
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  playSound('move');
  showScreen('game');
  
  // Configurar event listener do board (apenas uma vez)
  setupBoardListener();
  
  renderBoard();
  
  // Mostrar notificação de quem começa
  setTimeout(() => {
    if (isPlayingAgainstBot) {
      if (currentTurn === 'white') {
        showNotification('🎲 Você foi sorteado para começar!');
      } else {
        showNotification('🎲 BOT foi sorteado para começar!');
      }
    } else {
      if (currentTurn === playerColor) {
        showNotification('🎲 Você foi sorteado para começar!');
      } else {
        showNotification('🎲 Seu adversário foi sorteado para começar!');
      }
    }
    
    // Iniciar timer
    startTimer();
  }, 500);
  
  // Bot agora é gerenciado 100% pelo servidor
  // Não precisa mais de lógica no cliente
});

socket.on('moveMade', (data) => {
  console.log('🎮 Movimento recebido do servidor:', data);
  
  gameBoard = data.board;
  currentTurn = data.currentTurn;
  
  // Atualizar indicador de turno se existir
  if (currentTurnElement) {
    currentTurnElement.textContent = data.currentTurn === 'white' ? 'Brancas' : 'Pretas';
  }
  
  // Verificar se deve continuar capturando
  mustContinueCapture = data.mustContinue || false;
  continuingPiece = data.continuingPiece || null;
  
  if (mustContinueCapture && continuingPiece && currentTurn === playerColor) {
    // Auto-selecionar a peça que deve continuar capturando
    selectedPiece = continuingPiece;
    playSound('capture');
    showNotification('🎯 Continue capturando! Clique onde quer mover.');
    // Não reinicia timer, continua o mesmo turno
  } else {
    selectedPiece = null;
    mustContinueCapture = false;
    continuingPiece = null;
    
    // Tocar som de captura ou movimento
    if (data.wasCapture) {
      playSound('capture');
    } else {
      playSound('move');
    }
    
    // Reiniciar timer para o próximo turno
    startTimer();
  }
  
  console.log('🔄 Renderizando tabuleiro...');
  renderBoard();
  
  // Bot agora é gerenciado 100% pelo servidor - não fazer nada aqui
});

socket.on('invalidMove', (data) => {
  playSound('error');
  showNotification('❌ ' + data.message);
  selectedPiece = null;
  renderBoard();
});

socket.on('gameEnd', (data) => {
  stopTimer(); // Parar o timer quando o jogo terminar
  
  const won = data.winner === playerColor;
  
  if (won) {
    balance += data.prize;
    resultMessage.textContent = '🎉 Você Venceu!';
    prizeMessage.textContent = `Você ganhou R$ ${data.prize.toFixed(2)}`;
    playSound('win');
  } else {
    balance -= data.prize / 2;
    resultMessage.textContent = '😔 Você Perdeu';
    prizeMessage.textContent = `Você perdeu R$ ${(data.prize / 2).toFixed(2)}`;
    playSound('lose');
  }
  
  updateBalance();
  showScreen('result');
});

// Atualizar indicadores visuais de turno
function updateTurnIndicators() {
  const player1Card = document.querySelector('.player-you');
  const player2Card = document.querySelector('.player-opponent');
  
  if (player1Card && player2Card) {
    // Remover classe active de ambos
    player1Card.classList.remove('active-turn');
    player2Card.classList.remove('active-turn');
    
    // Adicionar classe active no jogador do turno atual
    if (currentTurn === playerColor) {
      player1Card.classList.add('active-turn');
    } else {
      player2Card.classList.add('active-turn');
    }
  }
  
  // Atualizar nomes dos jogadores se for contra bot
  if (isPlayingAgainstBot) {
    const player2Name = document.getElementById('player2Name');
    if (player2Name) {
      const botEmoji = botDifficulty === 'easy' ? '🤖' :
                       botDifficulty === 'medium' ? '🤖💪' :
                       botDifficulty === 'hard' ? '🤖🔥' : '🤖👑';
      player2Name.textContent = `${botEmoji} BOT ${botDifficulty.toUpperCase()}`;
    }
  }
}

// Renderizar tabuleiro
function renderBoard() {
  // Usar DocumentFragment para melhorar performance
  const fragment = document.createDocumentFragment();
  boardElement.innerHTML = '';
  
  // Atualizar indicadores visuais de turno
  updateTurnIndicators();
  
  // Calcular movimentos válidos APENAS se:
  // 1. Houver peça selecionada
  // 2. A peça for do jogador atual
  // 3. For o turno do jogador
  let validMoves = [];
  let mustShowCaptures = false;
  
  if (selectedPiece && playerColor === gameBoard[selectedPiece.row]?.[selectedPiece.col]?.color) {
    validMoves = getValidMovesForPiece(selectedPiece);
    
    // Verificar se há capturas obrigatórias disponíveis no tabuleiro
    const allCaptures = getAllCapturesForPlayer();
    mustShowCaptures = allCaptures.length > 0;
  }
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = document.createElement('div');
      cell.className = `cell ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      // Destacar célula selecionada
      if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
        cell.classList.add('selected');
      }
      
      // Destacar movimentos válidos APENAS da peça selecionada
      const isValidMove = validMoves.some(move => move.row === row && move.col === col);
      if (isValidMove && selectedPiece) {
        const move = validMoves.find(m => m.row === row && m.col === col);
        
        // Se há capturas obrigatórias, só mostrar capturas
        if (!mustShowCaptures || move.isCapture) {
          cell.classList.add('valid-move');
          
          // Adicionar indicador visual de movimento possível
          const indicator = document.createElement('div');
          indicator.className = 'move-indicator';
          cell.appendChild(indicator);
        }
      }
      
      const piece = gameBoard[row][col];
      if (piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${piece.color}-piece ${piece.isKing ? 'king' : ''}`;
        cell.appendChild(pieceElement);
      }
      
      // NÃO adicionar listener aqui - usar event delegation no board
      fragment.appendChild(cell);
    }
  }
  
  // Adicionar tudo de uma vez
  boardElement.appendChild(fragment);
}

// Event delegation - Um único listener para todo o board
let boardListenerAdded = false;

function setupBoardListener() {
  if (boardListenerAdded) return;
  
  boardElement.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    if (!isNaN(row) && !isNaN(col)) {
      handleCellClick(row, col);
    }
  });
  
  boardListenerAdded = true;
}

// Obter todas as capturas disponíveis para o jogador atual
function getAllCapturesForPlayer() {
  const captures = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameBoard[row][col];
      if (piece && piece.color === playerColor) {
        const pieceMoves = getValidMovesForPiece({ row, col });
        const pieceCaptures = pieceMoves.filter(m => m.isCapture);
        captures.push(...pieceCaptures);
      }
    }
  }
  
  return captures;
}

// Calcular movimentos válidos para uma peça
function getValidMovesForPiece(position) {
  const validMoves = [];
  const piece = gameBoard[position.row][position.col];
  if (!piece) return validMoves;
  
  // Direções diagonais
  const directions = [
    { row: -1, col: -1 },
    { row: -1, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 1 }
  ];
  
  for (const dir of directions) {
    // Peça normal - 1 ou 2 casas
    if (!piece.isKing) {
      // Movimento simples (1 casa)
      const moveRow = position.row + dir.row;
      const moveCol = position.col + dir.col;
      
      if (moveRow >= 0 && moveRow < 8 && moveCol >= 0 && moveCol < 8) {
        if (!gameBoard[moveRow][moveCol]) {
          // Verificar se é movimento válido (direção correta)
          if ((piece.color === 'white' && dir.row < 0) || 
              (piece.color === 'black' && dir.row > 0)) {
            validMoves.push({ row: moveRow, col: moveCol, isCapture: false });
          }
        }
      }
      
      // Captura (2 casas) - pode ser para trás
      const jumpRow = position.row + (dir.row * 2);
      const jumpCol = position.col + (dir.col * 2);
      const midRow = position.row + dir.row;
      const midCol = position.col + dir.col;
      
      if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
        const midPiece = gameBoard[midRow][midCol];
        const destPiece = gameBoard[jumpRow][jumpCol];
        
        if (midPiece && midPiece.color !== piece.color && !destPiece) {
          validMoves.push({ row: jumpRow, col: jumpCol, isCapture: true });
        }
      }
    } else {
      // Dama - múltiplas casas
      for (let dist = 1; dist < 8; dist++) {
        const moveRow = position.row + (dir.row * dist);
        const moveCol = position.col + (dir.col * dist);
        
        if (moveRow < 0 || moveRow >= 8 || moveCol < 0 || moveCol >= 8) break;
        
        const destPiece = gameBoard[moveRow][moveCol];
        
        // Movimento simples
        if (!destPiece) {
          validMoves.push({ row: moveRow, col: moveCol, isCapture: false });
        } else if (destPiece.color !== piece.color) {
          // Possível captura - verificar se há espaço depois
          for (let jumpDist = dist + 1; jumpDist < 8; jumpDist++) {
            const jumpRow = position.row + (dir.row * jumpDist);
            const jumpCol = position.col + (dir.col * jumpDist);
            
            if (jumpRow < 0 || jumpRow >= 8 || jumpCol < 0 || jumpCol >= 8) break;
            
            const jumpDestPiece = gameBoard[jumpRow][jumpCol];
            if (!jumpDestPiece) {
              validMoves.push({ row: jumpRow, col: jumpCol, isCapture: true });
            } else {
              break;
            }
          }
          break;
        } else {
          break;
        }
      }
    }
  }
  
  return validMoves;
}

function handleCellClick(row, col) {
  const piece = gameBoard[row][col];
  
  // Verificar se é o turno do jogador
  if (currentTurn !== playerColor && !mustContinueCapture) {
    playSound('error');
    showNotification('⚠️ Aguarde sua vez de jogar!');
    return;
  }
  
  // Se deve continuar capturando, só pode selecionar a peça específica
  if (mustContinueCapture && continuingPiece) {
    if (!selectedPiece) {
      // Só permite selecionar a peça que deve continuar
      if (row === continuingPiece.row && col === continuingPiece.col) {
        selectedPiece = { row, col };
        playSound('select');
        renderBoard();
      } else {
        playSound('error');
        showNotification('⚠️ Você deve continuar capturando com a mesma peça!');
      }
      return;
    }
  }
  
  if (selectedPiece) {
    // Se clicar na mesma peça, desselecionar
    if (selectedPiece.row === row && selectedPiece.col === col) {
      selectedPiece = null;
      renderBoard();
      return;
    }
    
    // Se clicar em outra peça sua, trocar seleção
    if (piece && piece.color === playerColor) {
      selectedPiece = { row, col };
      playSound('select');
      renderBoard();
      return;
    }
    
    // Tentar mover
    console.log('📤 Enviando movimento:', {
      roomId: currentRoom,
      from: selectedPiece,
      to: { row, col }
    });
    
    socket.emit('movePiece', {
      roomId: currentRoom,
      move: {
        from: selectedPiece,
        to: { row, col }
      }
    });
    
    // Limpar seleção após enviar o movimento
    // NÃO renderizar aqui - esperar resposta do servidor
    selectedPiece = null;
    
  } else if (piece && piece.color === playerColor) {
    // Selecionar peça
    selectedPiece = { row, col };
    playSound('select');
    renderBoard();
  }
}

// Navegação
function showScreen(screenName) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenName).classList.add('active');
}

leaveGameBtn.addEventListener('click', () => {
  if (confirm('Deseja realmente sair? Você perderá a aposta!')) {
    socket.disconnect();
    socket.connect();
    showScreen('lobby');
  }
});

backToLobbyBtn.addEventListener('click', () => {
  showScreen('lobby');
});

function updateBalance() {
  if (balanceElement) {
    balanceElement.textContent = balance.toFixed(2);
    console.log('💰 Saldo atualizado: R$', balance.toFixed(2));
  }
}

// Sistema de Sons com Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function createSound(frequency, duration, type = 'sine') {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playSound(soundName) {
  try {
    // Garantir que o AudioContext está rodando
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    switch(soundName) {
      case 'select':
        createSound(400, 0.1, 'sine');
        break;
      case 'move':
        createSound(300, 0.15, 'sine');
        setTimeout(() => createSound(350, 0.1, 'sine'), 50);
        break;
      case 'capture':
        createSound(500, 0.1, 'square');
        setTimeout(() => createSound(250, 0.15, 'square'), 80);
        break;
      case 'error':
        createSound(200, 0.2, 'sawtooth');
        break;
      case 'win':
        createSound(523, 0.15, 'sine'); // C
        setTimeout(() => createSound(659, 0.15, 'sine'), 150); // E
        setTimeout(() => createSound(784, 0.3, 'sine'), 300); // G
        break;
      case 'lose':
        createSound(400, 0.2, 'sine');
        setTimeout(() => createSound(300, 0.3, 'sine'), 200);
        break;
    }
  } catch (error) {
    console.log('Erro ao tocar som:', error);
  }
}

// Sistema de Notificações
function showNotification(message) {
  // Remover notificação anterior se existir
  const oldNotification = document.querySelector('.game-notification');
  if (oldNotification) {
    oldNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = 'game-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remover após 3 segundos
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// ==================== SISTEMA DE TIMER ====================

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
  if (!player1TimerElement || !player2TimerElement) return;
  
  const formattedTime = formatTimer(currentTimer);
  
  if (currentTurn === playerColor) {
    player1TimerElement.textContent = formattedTime;
    
    // Alerta visual quando tempo está acabando
    if (currentTimer <= 10) {
      player1TimerElement.classList.add('warning');
    } else {
      player1TimerElement.classList.remove('warning');
    }
  } else {
    player2TimerElement.textContent = formattedTime;
    
    if (currentTimer <= 10) {
      player2TimerElement.classList.add('warning');
    } else {
      player2TimerElement.classList.remove('warning');
    }
  }
}

function startTimer() {
  // Limpar timer anterior se existir
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  currentTimer = turnTimeLimit;
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    currentTimer--;
    updateTimerDisplay();
    
    // Avisos sonoros
    if (currentTimer === 10) {
      playSound('error');
      showNotification('⏰ 10 segundos restantes!');
    } else if (currentTimer === 5) {
      playSound('error');
    } else if (currentTimer === 0) {
      // Tempo esgotado!
      handleTimeOut();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleTimeOut() {
  stopTimer();
  
  console.log('⏰ Tempo esgotado!');
  
  if (currentTurn === playerColor) {
    // É o turno do jogador - fazer movimento automático
    showNotification('⏰ Tempo esgotado! Movimento automático...');
    playSound('error');
    
    setTimeout(() => {
      makeRandomMove();
    }, 500);
  }
  // Bot é gerenciado pelo servidor - não precisa forçar movimento aqui
}

function makeRandomMove() {
  // Encontrar todas as peças do jogador
  const playerPieces = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameBoard[row][col];
      if (piece && piece.color === playerColor) {
        playerPieces.push({ row, col });
      }
    }
  }
  
  if (playerPieces.length === 0) return;
  
  // Tentar encontrar um movimento válido
  let moveMade = false;
  const shuffled = playerPieces.sort(() => Math.random() - 0.5);
  
  for (const piece of shuffled) {
    // Tentar movimentos simples em todas as direções
    const directions = [
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    
    for (const [dr, dc] of directions) {
      const newRow = piece.row + dr;
      const newCol = piece.col + dc;
      
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        if (!gameBoard[newRow][newCol]) {
          // Encontrou um movimento válido
          console.log('🎲 Movimento automático:', { from: piece, to: { row: newRow, col: newCol } });
          
          socket.emit('movePiece', {
            roomId: currentRoom,
            move: {
              from: piece,
              to: { row: newRow, col: newCol }
            }
          });
          
          moveMade = true;
          break;
        }
      }
    }
    
    if (moveMade) break;
  }
  
  if (!moveMade) {
    console.log('❌ Não foi possível fazer movimento automático');
    showNotification('❌ Sem movimentos válidos!');
  }
}


