import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authRepository, type UserRow } from "./auth.repository.js";
import { badRequest, unauthorized } from "../../shared/http-error.js";

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  } as jwt.SignOptions);
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatar_url,
    bio: u.bio,
    country: u.country,
    role: u.role,
    plan: u.plan,
  };
}

export const authService = {
  async register(name: string, email: string, password: string, country?: string) {
    if (!name || name.trim().length < 2) throw badRequest("Le nom doit faire au moins 2 caractères.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("Email invalide.");
    if (!password || password.length < 8) throw badRequest("Le mot de passe doit faire au moins 8 caractères.");

    const existing = await authRepository.findByEmail(email);
    if (existing) throw badRequest("Un compte existe déjà avec cet email.");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await authRepository.create({ name: name.trim(), email, passwordHash, country });
    return { user: publicUser(user), token: signToken(user.id) };
  },

  async login(email: string, password: string) {
    const user = await authRepository.findByEmail(email);
    if (!user || !user.password_hash) throw unauthorized("Email ou mot de passe incorrect.");

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw unauthorized("Email ou mot de passe incorrect.");

    return { user: publicUser(user), token: signToken(user.id) };
  },

  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw unauthorized();
    return publicUser(user);
  },
};
