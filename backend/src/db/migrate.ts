// Exécute les fichiers .sql de ./migrations dans l'ordre alphabétique,
// une seule fois chacun (suivi dans une table _migrations). Volontairement
// simple — pas d'outil tiers, juste du SQL brut et un compteur.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./pool.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dir, "migrations");

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await pool.query("SELECT name FROM _migrations")).rows.map((r: { name: string }) => r.name)
  );

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] déjà appliquée : ${file}`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`[migrate] application de ${file}...`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] ok : ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  console.log("[migrate] terminé.");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] échec :", err);
  process.exit(1);
});
