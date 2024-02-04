const fs = require('fs');
const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');

class SolanaTestWallet {
  constructor() {
    // Solana Testnet'e bağlantı oluşturalım
    this.connection = new Connection('https://api.testnet.solana.com', 'confirmed');
    
    // Cüzdanı yükle veya oluşturuyoruz
    this.loadOrCreateWallet();
  }

  loadOrCreateWallet() {
    try {
      // Eğer cüzdan dosyası varsa, cüzdanı yüklüyoruz
      const walletData = fs.readFileSync('test_wallet.json', 'utf-8');
      const parsedWallet = JSON.parse(walletData);

      this.wallet = Keypair.fromSecretKey(Uint8Array.from(parsedWallet.secretKey));
      console.log('Wallet loaded successfully.');
    } catch (err) {
      // Eğer cüzdan dosyası yoksa, yeni bir cüzdan oluşturuyoruz
      this.wallet = Keypair.generate();
      this.saveWallet();
      console.log('New wallet created.');
    }
  }

  saveWallet() {
    // Cüzdan bilgilerini JSON formatında kaydediyoruz
    const walletData = {
      secretKey: Array.from(this.wallet.secretKey),
      publicKey: this.wallet.publicKey.toBase58(),
      balance: this.getBalance(),
    };

    fs.writeFileSync('test_wallet.json', JSON.stringify(walletData, null, 2), 'utf-8');
  }

  async requestAirdrop() {
    // Airdrop isteği gönder ve beklenen SOL'u alalım
    const airdropSignature = await this.connection.requestAirdrop(this.wallet.publicKey, LAMPORTS_PER_SOL);
    await this.connection.confirmTransaction(airdropSignature);
    console.log('Airdrop successful.');
  }

  async getBalance() {
    // Cüzdanın bakiyesini SOL cinsinden alalım
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async executeCommand(command, param1, param2) {
    switch (command) {
      case 'new':
        // Yeni bir cüzdan oluştur veya var olanı yükleyelim
        this.loadOrCreateWallet();
        console.log('Wallet created or loaded.');
        break;

      case 'airdrop':
        // Belirtilen miktarda airdrop alalım
        const amount = param1 ? parseInt(param1) : 1;
        await this.requestAirdrop(amount);
        console.log(`Airdrop of ${amount} SOL completed.`);
        this.saveWallet();
        break;

      case 'balance':
        // Cüzdan bakiyesini kontrol edelim
        const currentBalance = await this.getBalance();
        console.log(`Current balance: ${currentBalance} SOL`);
        break;

      case 'transfer':
        if (!param1 || !param2) {
          // Transfer komutu için gerekli parametreleri kontrol etsin
          console.error('Please provide recipient address and amount for the transfer.');
          return;
        }

        // Belirtilen adrese belirtilen miktarda SOL transfer etsin
        const recipientAddress = new PublicKey(param1);
        const transferAmount = parseInt(param2);

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.wallet.publicKey,
            toPubkey: recipientAddress,
            lamports: transferAmount * LAMPORTS_PER_SOL,
          })
        );

        await sendAndConfirmTransaction(this.connection, transaction, [this.wallet]);
        console.log(`Transfer of ${transferAmount} SOL to ${recipientAddress.toBase58()} completed.`);
        this.saveWallet();
        break;

      default:
        // Geçersiz komut varsa bildirr
        console.error('Invalid command. Supported commands: new, airdrop, balance, transfer.');
    }
  }
}

// Konsoldan gelen komutları işledik
const wallet = new SolanaTestWallet();
const [command, param1, param2] = process.argv.slice(2);
wallet.executeCommand(command, param1, param2);