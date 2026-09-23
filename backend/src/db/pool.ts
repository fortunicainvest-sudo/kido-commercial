import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon coupe les connexions inactives et impose TLS en production ;
  // en dev local (Postgres sans TLS), on désactive simplement la vérif.
  ssl: process.env.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: true } : false,
  max: 10,
});

pool.on("error", (err: Error) => {
  console.error("[db] erreur inattendue sur une connexion inactive", err);
});
