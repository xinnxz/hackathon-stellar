/**
 * budget.js
 * =========
 * Intel spending tracker — tracks how much the agent spends on data/intelligence.
 * 
 * PENJELASAN:
 * Agent punya budget terbatas untuk membeli data (intel).
 * Setiap kali bayar MPP (0.01 USDC) atau x402 (0.01 USDC), budget berkurang.
 * Ketika budget habis → agent STOP membeli data → STOP trading.
 * 
 * Ini penting untuk:
 * 1. Demo: menunjukkan "safety feature" ke juri
 * 2. Real-world: agent tidak bisa tiba-tiba habiskan semua dana
 */

export class Budget {
  /**
   * @param {number} totalBudget - Total USDC yang boleh dipakai untuk intel
   * 
   * PENJELASAN STATE:
   * - totalBudget: batas maksimal spending
   * - spent: berapa yang sudah dipakai
   * - payments: log setiap pembayaran intel
   */
  constructor(totalBudget = 1.0) {
    this.totalBudget = totalBudget;
    this.spent = 0;
    this.payments = [];
  }

  /**
   * canSpend(amount)
   * Cek apakah masih bisa mengeluarkan sejumlah USDC.
   * 
   * KENAPA PERLU?  
   * Sebelum agent membayar data, dia HARUS cek budget dulu.
   * Jika budget < cost → agent TIDAK BOLEH bayar → HOLD.
   */
  canSpend(amount) {
    return (this.spent + amount) <= this.totalBudget;
  }

  /**
   * recordSpending(amount, protocol, description)
   * Catat pengeluaran intel baru.
   * 
   * @param {number} amount - Jumlah USDC yang dibayar
   * @param {string} protocol - "MPP" atau "x402"
   * @param {string} description - Deskripsi pembayaran
   */
  recordSpending(amount, protocol, description = '') {
    this.spent += amount;
    this.payments.push({
      amount,
      protocol,
      description,
      timestamp: new Date().toISOString(),
      remaining: this.getRemaining()
    });
  }

  /**
   * getRemaining() → sisa budget
   * getPercentUsed() → persentase yang sudah terpakai (untuk gauge di dashboard)
   */
  getRemaining() {
    return parseFloat((this.totalBudget - this.spent).toFixed(4));
  }

  getPercentUsed() {
    return parseFloat(((this.spent / this.totalBudget) * 100).toFixed(1));
  }

  /**
   * getStatus() → full status untuk dashboard
   */
  getStatus() {
    return {
      total: this.totalBudget,
      spent: parseFloat(this.spent.toFixed(4)),
      remaining: this.getRemaining(),
      percentUsed: this.getPercentUsed(),
      paymentCount: this.payments.length,
      canContinue: this.canSpend(0.02),  // Need at least 0.02 for MPP + x402
      payments: this.payments
    };
  }
}
