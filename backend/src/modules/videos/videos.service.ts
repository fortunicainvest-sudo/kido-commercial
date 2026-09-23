import { videosRepository, type VideoRow } from "./videos.repository.js";
import { storageService } from "./storage.service.js";
import { badRequest, notFound } from "../../shared/http-error.js";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function publicVideo(v: VideoRow) {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    url: storageService.publicUrl(v.storage_key),
    thumbnailUrl: v.thumbnail_key ? storageService.publicUrl(v.thumbnail_key) : null,
    durationSeconds: v.duration_seconds,
    likeCount: v.like_count,
    viewCount: v.view_count,
    sourceEventId: v.source_event_id,
    creator: { id: v.creator_id, name: v.creator_name, avatarUrl: v.creator_avatar },
    createdAt: v.created_at,
  };
}

export const videosService = {
  async requestUpload(userId: string, contentType: string) {
    if (!ALLOWED_TYPES.includes(contentType)) throw badRequest("Format vidéo non supporté (mp4, webm ou mov).");
    return storageService.createUploadUrl(userId, contentType);
  },

  async publish(userId: string, dto: { title: string; description?: string; storageKey: string; sourceEventId?: string }) {
    if (!dto.title || dto.title.trim().length < 3) throw badRequest("Titre trop court.");
    if (!dto.storageKey) throw badRequest("Aucun fichier uploadé.");
    const video = await videosRepository.create({
      creatorId: userId,
      title: dto.title.trim().slice(0, 120),
      description: dto.description?.trim().slice(0, 2000) ?? null,
      storageKey: dto.storageKey,
      sourceEventId: dto.sourceEventId ?? null,
    });
    // create() ne fait pas la jointure sur users — on recharge pour renvoyer
    // une réponse cohérente avec le reste de l'API (même correction que
    // pour events.service.ts::create).
    return publicVideo((await videosRepository.byId(video.id))!);
  },

  async feed() {
    const rows = await videosRepository.feed();
    return rows.map(publicVideo);
  },

  async view(id: string) {
    const video = await videosRepository.byId(id);
    if (!video) throw notFound("Vidéo introuvable.");
    await videosRepository.incrementView(id);
    return publicVideo(video);
  },

  async like(userId: string, id: string) {
    await videosRepository.like(id, userId);
  },

  async unlike(userId: string, id: string) {
    await videosRepository.unlike(id, userId);
  },
};
