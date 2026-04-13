/**
 * env-loader.js
 * ==============
 * Shared utility: Load .env file manually tanpa package dependency.
 * 
 * PENJELASAN:
 * OpenClaw skills berjalan dari folder skills/ yang belum tentu punya
 * node_modules. Jadi kita load .env secara manual:
 * 1. Cari file .env di root project (../../.env dari skills/)
 * 2. Parse key=value pairs
 * 3. Set ke process.env
 * 
 * Ini menghindari dependency ke package 'dotenv'.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function loadEnv() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) return;
  
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Don't override existing env vars
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
