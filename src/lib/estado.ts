import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Estado único compartilhado (uma linha no Neon) com as vazões e carteiras digitadas.
const estadoSchema = z.object({
  vazao: z.record(z.string(), z.string().max(32)),
  carteira: z.record(z.string(), z.string().max(32)),
  // Configuração do quadro de horas do mês (opcional para aceitar estados antigos).
  horas: z.record(z.string(), z.string().max(32)).optional(),
});

export type Estado = z.infer<typeof estadoSchema>;

const ID = "principal";

async function db() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL não configurada");
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS carteira_estado (
    id text PRIMARY KEY,
    dados jsonb NOT NULL,
    atualizado_em timestamptz NOT NULL DEFAULT now()
  )`;
  return sql;
}

export const carregarEstado = createServerFn({ method: "GET" }).handler(
  async (): Promise<Estado | null> => {
    const sql = await db();
    const rows = await sql`SELECT dados FROM carteira_estado WHERE id = ${ID}`;
    const parsed = estadoSchema.safeParse(rows[0]?.["dados"]);
    return parsed.success ? parsed.data : null;
  },
);

export const salvarEstado = createServerFn({ method: "POST" })
  .validator(estadoSchema)
  .handler(async ({ data }) => {
    const sql = await db();
    await sql`INSERT INTO carteira_estado (id, dados, atualizado_em)
      VALUES (${ID}, ${JSON.stringify(data)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now()`;
    return { ok: true };
  });
