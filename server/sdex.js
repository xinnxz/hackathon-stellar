/**
 * sdex.js
 * =======
 * SDEX (Stellar Decentralized Exchange) trading module.
 * 
 * PENJELASAN SDEX:
 * Stellar punya DEX bawaan (built-in) — tidak perlu smart contract seperti Uniswap.
 * Trading dilakukan via operasi manageBuyOffer / manageSellOffer di Stellar core.
 * 
 * KEUNTUNGAN SDEX:
 * - No gas fee terpisah (cuma ~0.00001 XLM per TX)
 * - Instant settlement
 * - Built into Stellar protocol (bukan smart contract tambahan)
 * - Orderbook on-chain
 * 
 * OPERASI:
 * - manageBuyOffer: "Saya mau BELI X amount XLM seharga Y USDC per XLM"
 * - manageSellOffer: "Saya mau JUAL X amount XLM seharga Y USDC per XLM"
 */
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  BASE_FEE
} from '@stellar/stellar-sdk';

const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export class SDEXTrader {
  constructor(keypair, horizonUrl = 'https://horizon-testnet.stellar.org') {
    this.keypair = keypair;
    this.server = new Horizon.Server(horizonUrl);
    this.xlm = Asset.native();
    this.usdc = new Asset('USDC', USDC_ISSUER);
    this.network = Networks.TESTNET;
  }

  /**
   * buy(amount, price)
   * Beli XLM dengan USDC di SDEX.
   * 
   * PENJELASAN manageBuyOffer:
   * - buying: aset yang mau dibeli (XLM)
   * - selling: aset yang dipakai bayar (USDC)
   * - buyAmount: jumlah XLM yang mau dibeli
   * - price: harga per XLM dalam USDC (misal "0.12")
   * - offerId: "0" = buat order baru (bukan edit existing)
   * 
   * @param {number} amount - Jumlah XLM yang mau dibeli
   * @param {string} price - Harga per XLM dalam USDC
   */
  async buy(amount, price) {
    try {
      const account = await this.server.loadAccount(this.keypair.publicKey());
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.network
      })
        .addOperation(Operation.manageBuyOffer({
          buying: this.xlm,
          selling: this.usdc,
          buyAmount: String(amount),
          price: String(price),     // price of 1 unit of buying in terms of selling
          offerId: '0'              // 0 = new offer
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(this.keypair);
      const result = await this.server.submitTransaction(transaction);
      
      console.log(`📈 [SDEX] BUY ${amount} XLM @ $${price} — TX: ${result.hash}`);
      
      return {
        success: true,
        action: 'BUY',
        amount,
        price,
        hash: result.hash,
        ledger: result.ledger,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [SDEX] Buy failed:', error.message);
      return { success: false, action: 'BUY', error: error.message };
    }
  }

  /**
   * sell(amount, price)
   * Jual XLM untuk USDC di SDEX.
   * 
   * PENJELASAN manageSellOffer:
   * - selling: aset yang dijual (XLM)
   * - buying: aset yang diterima (USDC)
   * - amount: jumlah XLM yang dijual
   * - price: harga per XLM dalam USDC
   */
  async sell(amount, price) {
    try {
      const account = await this.server.loadAccount(this.keypair.publicKey());
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.network
      })
        .addOperation(Operation.manageSellOffer({
          selling: this.xlm,
          buying: this.usdc,
          amount: String(amount),
          price: String(price),
          offerId: '0'
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(this.keypair);
      const result = await this.server.submitTransaction(transaction);
      
      console.log(`📉 [SDEX] SELL ${amount} XLM @ $${price} — TX: ${result.hash}`);
      
      return {
        success: true,
        action: 'SELL',
        amount,
        price,
        hash: result.hash,
        ledger: result.ledger,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [SDEX] Sell failed:', error.message);
      return { success: false, action: 'SELL', error: error.message };
    }
  }

  /**
   * getOrderbook()
   * Ambil orderbook SDEX untuk pair XLM/USDC.
   */
  async getOrderbook(limit = 5) {
    try {
      const orderbook = await this.server
        .orderbook(this.xlm, this.usdc)
        .limit(limit)
        .call();
      
      return {
        bids: orderbook.bids.map(b => ({ price: b.price, amount: b.amount })),
        asks: orderbook.asks.map(a => ({ price: a.price, amount: a.amount }))
      };
    } catch (error) {
      return { bids: [], asks: [], error: error.message };
    }
  }
}
