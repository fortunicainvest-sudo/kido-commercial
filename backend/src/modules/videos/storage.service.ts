// Client de stockage compatible S3 pour Cloudflare R2. R2 parle l'API S3,
// donc on utilise le SDK AWS standard pointé sur l'endpoint R2 — pas de
// dépendance propriétaire Cloudflare.
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

function client(): S3Client {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Variables R2_* manquantes dans .env — crée un bucket R2 et une clé API sur ton dashboard Cloudflare.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

export const storageService = {
  /** URL signée valable 10 minutes permettant au navigateur d'uploader le
   *  fichier DIRECTEMENT vers R2, sans faire transiter la vidéo par notre
   *  serveur (évite de saturer le backend avec de gros fichiers). */
  async createUploadUrl(userId: string, contentType: string): Promise<{ uploadUrl: string; key: string }> {
    const ext = contentType.split("/")[1] || "bin";
    const key = `videos/${userId}/${nanoid(16)}.${ext}`;
    const uploadUrl = await getSignedUrl(
      client(),
      new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 600 }
    );
    return { uploadUrl, key };
  },

  publicUrl(key: string): string {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  },

  async downloadUrl(key: string): Promise<string> {
    return getSignedUrl(client(), new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }), { expiresIn: 3600 });
  },
};
