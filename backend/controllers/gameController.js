// Controlador de lógica do jogo

class GameController {
  constructor() {
    this.games = new Map();
  }

  createGame(roomId, players, betAmount) {
    const game = {
      roomId,
      players,
      betAmount,
      currentTurn: 'white',
      board: this.createInitialBoard(),
      escrow: betAmount * 2,
      moveHistory: []
    };

    this.games.set(roomId, game);
    return game;
  }

  createInitialBoard() {
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

  getGame(roomId) {
    return this.games.get(roomId);
  }

  deleteGame(roomId) {
    this.games.delete(roomId);
  }

  getAllGames() {
    return Array.from(this.games.values());
  }
}

module.exports = new GameController();
