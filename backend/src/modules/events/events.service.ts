import { eventsRepository, type EventRow } from "./events.repository.js";
import { MODULES, CATEGORIES, applyModuleRules, type ModuleKey } from "./modules.config.js";
import { tiersRepository } from "../tiers/tiers.repository.js";
import { badRequest, forbidden, notFound } from "../../shared/http-error.js";

const ACCESS_LEVELS = ["STANDARD", "VIP", "SPEAKER", "STAFF"];

export function publicEvent(e: EventRow) {
  return {
    id: e.id,
    module: e.module,
    title: e.title,
    description: e.description,
    category: e.category,
    coverUrl: e.cover_url,
    trailerUrl: e.trailer_url,
    startsAt: e.starts_at,
    priceCents: e.price_cents,
    currency: e.currency,
    maxSeats: e.max_seats,
    seatsSold: e.seats_sold,
    seatsLeft: e.max_seats === null ? null : Math.max(e.max_seats - e.seats_sold, 0),
    visibility: e.visibility,
    streamMode: e.stream_mode,
    status: e.status,
    roomName: e.room_name,
    creator: { id: e.creator_id, name: e.creator_name, avatarUrl: e.creator_avatar },
    createdAt: e.created_at,
  };
}

interface CreateEventDto {
  module: string; title: string; description?: string; category?: string;
  coverUrl?: string; trailerUrl?: string; startsAt?: string | null;
  priceCents?: number; currency?: string; maxSeats?: number | null;
  visibility?: string; streamMode?: string;
  moderators?: { email: string; name?: string }[];
  tiers?: { accessLevel: string; label?: string; priceCents: number; maxQuantity?: number | null }[];
}

export const eventsService = {
  listModules() {
    return Object.entries(MODULES).map(([key, m]) => ({ key, ...m }));
  },

  async create(creatorId: string, dto: CreateEventDto) {
    const moduleKey = dto.module as ModuleKey;
    if (!MODULES[moduleKey]) throw badRequest("Ce type d'événement n'existe pas.");
    const mod = MODULES[moduleKey];

    if (!dto.title || dto.title.trim().length < 3) throw badRequest("Titre trop court.");
    const category = dto.category || mod.category;
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) throw badRequest("Catégorie invalide.");

    const rules = applyModuleRules(moduleKey, {
      priceCents: dto.priceCents ?? 0,
      maxSeats: dto.maxSeats ?? null,
      visibility: dto.visibility ?? "public",
      streamMode: dto.streamMode,
    });

    const event = await eventsRepository.create({
      creatorId,
      module: moduleKey,
      title: dto.title.trim().slice(0, 120),
      description: dto.description?.trim().slice(0, 4000) ?? null,
      category,
      coverUrl: dto.coverUrl ?? null,
      trailerUrl: dto.trailerUrl ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      priceCents: Math.max(0, Math.round(rules.priceCents ?? 0)),
      currency: dto.currency || "XOF",
      maxSeats: rules.maxSeats ?? null,
      visibility: rules.visibility === "private" ? "private" : "public",
      streamMode: rules.streamMode || mod.defaultStreamMode,
    });

    // Tarification multi-niveaux (Kido Pass STANDARD/VIP/SPEAKER/STAFF) —
    // facultative ; sans elle, l'événement garde son prix/quota uniques.
    if (dto.tiers?.length && mod.ticketing) {
      const seen = new Set<string>();
      const valid = dto.tiers.filter((t) => {
        if (!ACCESS_LEVELS.includes(t.accessLevel) || seen.has(t.accessLevel)) return false;
        seen.add(t.accessLevel);
        return true;
      }).map((t) => ({
        accessLevel: t.accessLevel,
        label: t.label?.slice(0, 60),
        priceCents: Math.max(0, Math.round(t.priceCents)),
        maxQuantity: t.maxQuantity ?? null,
      }));
      if (valid.length) await tiersRepository.createMany(event.id, valid);
    }

    if (dto.moderators?.length) {
      const valid = dto.moderators
        .filter((m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email || ""))
        .map((m) => ({ email: m.email.toLowerCase(), name: m.name?.slice(0, 40) ?? null }));
      await eventsRepository.addModerators(event.id, valid);
    }

    // create() ne fait pas la jointure sur users (elle n'a pas besoin du nom
    // du créateur pour insérer) — on recharge via byId() pour renvoyer une
    // réponse complète et cohérente avec le reste de l'API.
    return publicEvent((await eventsRepository.byId(event.id))!);
  },

  async detail(id: string) {
    const event = await eventsRepository.byId(id);
    if (!event) throw notFound("Cet événement n'existe pas.");
    return publicEvent(event);
  },

  async explorer(category?: string) {
    const rows = await eventsRepository.listPublic({ category });
    return rows.map(publicEvent);
  },

  async mine(userId: string) {
    const rows = await eventsRepository.byCreator(userId);
    return rows.map(publicEvent);
  },

  async tiers(eventId: string) {
    const rows = await tiersRepository.forEvent(eventId);
    return rows.map((t) => ({
      id: t.id,
      accessLevel: t.access_level,
      label: t.label,
      priceCents: t.price_cents,
      maxQuantity: t.max_quantity,
      quantitySold: t.quantity_sold,
      quantityLeft: t.max_quantity === null ? null : Math.max(t.max_quantity - t.quantity_sold, 0),
    }));
  },

  async listModerators(userId: string, eventId: string) {
    const event = await eventsRepository.byId(eventId);
    if (!event) throw notFound();
    if (event.creator_id !== userId) throw forbidden("Seul le créateur voit ses modérateurs.");
    return eventsRepository.moderators(eventId);
  },

  async removeModerator(userId: string, eventId: string, modId: string) {
    const event = await eventsRepository.byId(eventId);
    if (!event) throw notFound();
    if (event.creator_id !== userId) throw forbidden("Seul le créateur retire un modérateur.");
    return eventsRepository.removeModerator(eventId, modId);
  },
};
