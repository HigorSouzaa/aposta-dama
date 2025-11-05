// Controlador de carteira e apostas

class WalletController {
  constructor() {
    this.wallets = new Map();
  }

  createWallet(userId) {
    this.wallets.set(userId, {
      userId,
      balance: 100.00, // Saldo inicial
      transactions: []
    });
  }

  getBalance(userId) {
    const wallet = this.wallets.get(userId);
    return wallet ? wallet.balance : 0;
  }

  addFunds(userId, amount) {
    const wallet = this.wallets.get(userId);
    if (wallet) {
      wallet.balance += amount;
      wallet.transactions.push({
        type: 'deposit',
        amount,
        timestamp: new Date()
      });
      return true;
    }
    return false;
  }

  withdrawFunds(userId, amount) {
    const wallet = this.wallets.get(userId);
    if (wallet && wallet.balance >= amount) {
      wallet.balance -= amount;
      wallet.transactions.push({
        type: 'withdrawal',
        amount,
        timestamp: new Date()
      });
      return true;
    }
    return false;
  }

  processBet(userId, amount) {
    return this.withdrawFunds(userId, amount);
  }

  processWinnings(userId, amount) {
    return this.addFunds(userId, amount);
  }

  getTransactionHistory(userId) {
    const wallet = this.wallets.get(userId);
    return wallet ? wallet.transactions : [];
  }
}

module.exports = new WalletController();
