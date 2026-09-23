// Le "Kido Pass" : un JWT signé (HMAC SHA-256) distinct du token de session,
// encodé dans le QR code du billet. La signature prouve l'authenticité ;
// le statut en base (voir tickets.repository.ts) reste l'unique source de
// vérité anti-rejeu — un pass valide peut très bien avoir déjà été scanné.
import jwt from "jsonwebtoken";

export interface KidoPassPayload {
  ticketId: string;
  eventId: string;
  accessLevel: string;
}

function secret(): string {
  const s = process.env.KIDO_PASS_SECRET;
  if (!s) throw new Error("KIDO_PASS_SECRET manquant dans .env");
  return s;
}

export function signKidoPass(payload: KidoPassPayload): string {
  return jwt.sign(payload, secret(), { algorithm: "HS256" });
}

export function verifyKidoPass(token: string): KidoPassPayload {
  return jwt.verify(token, secret(), { algorithms: ["HS256"] }) as unknown as KidoPassPayload;
}
