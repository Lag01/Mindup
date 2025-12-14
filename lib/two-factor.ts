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
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Stocker l'IV avec les données chiffrées (séparés par ':')
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Déchiffrer le secret 2FA depuis la BDD
 */
export function decryptSecret(encryptedSecret: string): string {
  const parts = encryptedSecret.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];

  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
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
