import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Configuration otplib
authenticator.options = {
  window: 1, // Permet 1 code avant/après pour tenir compte du décalage temporel
};

const APP_NAME = 'Flashcards App';
const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || 'fallback-key-change-in-production';

/**
 * Chiffrer le secret 2FA avant stockage
 */
export function encryptSecret(secret: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Déchiffrer le secret 2FA depuis la BDD
 */
export function decryptSecret(encryptedSecret: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Générer un nouveau secret 2FA
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Générer l'URL otpauth pour QR code
 */
export function generateOtpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, APP_NAME, secret);
}

/**
 * Générer un QR code en base64
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Impossible de générer le QR code');
  }
}

/**
 * Vérifier un code TOTP
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
}

/**
 * Générer un code TOTP (pour tests uniquement)
 */
export function generateToken(secret: string): string {
  return authenticator.generate(secret);
}
