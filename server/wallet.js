/**
 * wallet.js
 * =========
 * Stellar wallet management untuk agent.
 * 
 * PENJELASAN:
 * - Mengelola Stellar keypair agent (public + secret key)
 * - Query balance XLM dan USDC dari Horizon API
 * - Horizon = Stellar's REST API server (seperti Etherscan API untuk Ethereum)
 * 
 * KONSEP KUNCI:
 * - XLM = native asset Stellar (untuk gas fee, ~0.00001 XLM per TX)
 * - USDC = stablecoin (1 USDC = $1), dipakai untuk trading + pembayaran data
 * - Trustline = "izin" memegang aset non-native (harus di-setup sebelum terima USDC)
 */
import {
  Keypair,
  Horizon,
  Asset,
  Networks,
  TransactionBuilder,
  Operation,
  BASE_FEE
} from '@stellar/stellar-sdk';

// USDC on Stellar Testnet (Circle's issuer)
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export class Wallet {
  /**
   * @param {string} secretKey - Stellar secret key (S...)
   * @param {string} horizonUrl - URL Horizon server
   * 
   * PENJELASAN:
   * - Keypair.fromSecret() → mengambil keypair dari secret key
   * - Server Horizon → koneksi ke Stellar network untuk query data
   */
  constructor(secretKey, horizonUrl = 'https://horizon-testnet.stellar.org') {
    this.keypair = Keypair.fromSecret(secretKey);
    this.publicKey = this.keypair.publicKey();
    this.server = new Horizon.Server(horizonUrl);
    this.network = Networks.TESTNET;
  }

  /**
   * getBalances()
   * Mengambil semua saldo dari akun Stellar.
   * 
   * PENJELASAN:
   * Setiap akun Stellar bisa memiliki beberapa aset:
   * - "native" → XLM
   * - credit_alphanum4 "USDC" → USDC stablecoin
   * 
   * Kita extract XLM dan USDC saja karena itu yang dipakai trading.
   */
  async getBalances() {
    try {
      const account = await this.server.loadAccount(this.publicKey);
      
      let xlm = '0';
      let usdc = '0';
      
      for (const balance of account.balances) {
        if (balance.asset_type === 'native') {
          xlm = balance.balance;
        } else if (
          balance.asset_code === 'USDC' &&
          balance.asset_issuer === USDC_ISSUER
        ) {
          usdc = balance.balance;
        }
      }
      
      return {
        xlm: parseFloat(xlm),
        usdc: parseFloat(usdc),
        publicKey: this.publicKey
      };
    } catch (error) {
      console.error('❌ Failed to get balances:', error.message);
      return { xlm: 0, usdc: 0, publicKey: this.publicKey, error: error.message };
    }
  }

  /**
   * sendPayment()
   * Mengirim pembayaran USDC ke alamat tujuan.
   * 
   * PENJELASAN FLOW:
   * 1. loadAccount() → ambil sequence number (seperti nonce di Ethereum)
   * 2. TransactionBuilder → buat transaksi
   * 3. addOperation(payment) → tambahkan instruksi pembayaran
   * 4. sign() → tanda tangan dengan secret key
   * 5. submitTransaction() → kirim ke network
   * 
   * @param {string} destination - Public key tujuan
   * @param {string} amount - Jumlah USDC
   * @returns {Object} TX result dengan hash
   */
  async sendPayment(destination, amount, asset = 'USDC') {
    try {
      const account = await this.server.loadAccount(this.publicKey);
      
      const stellarAsset = asset === 'XLM'
        ? Asset.native()
        : new Asset('USDC', USDC_ISSUER);
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.network
      })
        .addOperation(Operation.payment({
          destination,
          asset: stellarAsset,
          amount: String(amount)
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(this.keypair);
      
      const result = await this.server.submitTransaction(transaction);
      
      return {
        success: true,
        hash: result.hash,
        ledger: result.ledger,
        fee: result.fee_charged
      };
    } catch (error) {
      console.error('❌ Payment failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * getTransactionHistory()
   * Ambil riwayat transaksi terbaru dari akun.
   */
  async getTransactionHistory(limit = 10) {
    try {
      const transactions = await this.server
        .transactions()
        .forAccount(this.publicKey)
        .order('desc')
        .limit(limit)
        .call();
      
      return transactions.records.map(tx => ({
        hash: tx.hash,
        created_at: tx.created_at,
        fee: tx.fee_charged,
        memo: tx.memo,
        successful: tx.successful
      }));
    } catch (error) {
      return [];
    }
  }
}
