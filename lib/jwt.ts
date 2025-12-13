import { SignJWT, jwtVerify } from 'jose';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET n\'est pas défini dans les variables d\'environnement');
}

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function signToken(payload: { userId: string }): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h') // Token expire après 2 heures
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch (error) {
    // Token invalide, expiré ou falsifié
    return null;
  }
}
