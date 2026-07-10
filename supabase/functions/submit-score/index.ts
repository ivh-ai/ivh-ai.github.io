// submit-score — server-side leaderboard writes for COTE and MathSprint.
//
// Why this exists: both games are static front-ends with no login, so they can
// only carry the public anon key. With Row Level Security enabled to block anon
// writes, all inserts/updates must go through here. This function runs with the
// service-role key (injected by the platform, never shipped to the browser),
// validates every field, computes derived scores server-side so they can't be
// forged, and performs the same "keep your best" upsert the games used to do
// client-side. Reads stay public and direct — only writes are gated.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const ALLOWED_ORIGINS = new Set([
  "https://ivh-ai.github.io",
  "http://localhost:8642",
  "http://127.0.0.1:8642",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const MATH_MODES = new Set([
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "mixed",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://ivh-ai.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    Vary: "Origin",
  };
}

function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.trim().replace(/\s+/g, " ").slice(0, 24);
  return name.length >= 1 ? name : null;
}

function intInRange(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return i >= min && i <= max ? i : null;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return json({ error: "method not allowed" }, 405, cors);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400, cors);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const name = cleanName(body.name);
  if (!name) return json({ error: "invalid name" }, 400, cors);

  // ── MathSprint ─────────────────────────────────────────────────────────────
  if (body.game === "mathsprint") {
    const mode = String(body.mode ?? "");
    if (!MATH_MODES.has(mode)) return json({ error: "invalid mode" }, 400, cors);

    const total = intInRange(body.total_questions, 0, 100000);
    const score = intInRange(body.score, 0, 100000);
    const accuracy = intInRange(body.accuracy, 0, 100);
    if (total === null || score === null || accuracy === null)
      return json({ error: "invalid score payload" }, 400, cors);

    const { data: existing, error: readErr } = await supabase
      .from("scores")
      .select("id,score")
      .eq("name", name)
      .eq("mode", mode)
      .limit(1);
    if (readErr) return json({ error: "read failed" }, 500, cors);

    if (!existing || existing.length === 0) {
      const { error } = await supabase
        .from("scores")
        .insert({ name, mode, score, total_questions: total, accuracy });
      if (error) return json({ error: "write failed" }, 500, cors);
    } else if (score > (existing[0].score as number)) {
      const { error } = await supabase
        .from("scores")
        .update({
          score,
          total_questions: total,
          accuracy,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
      if (error) return json({ error: "write failed" }, 500, cors);
    }

    const { data: lb } = await supabase
      .from("scores")
      .select("*")
      .eq("mode", mode)
      .order("score", { ascending: false })
      .order("accuracy", { ascending: false })
      .limit(10);
    const rank = (lb ?? []).findIndex((r) => r.name === name);
    return json(
      { ok: true, rank: rank >= 0 ? rank + 1 : 99, leaderboard: lb ?? [] },
      200,
      cors,
    );
  }

  // ── COTE (Countries of the Earth) ────────────────────────────────────────────
  if (body.game === "cote") {
    const countries = intInRange(body.countries, 0, 300);
    const seconds = intInRange(body.seconds, 0, 100000);
    if (countries === null || seconds === null)
      return json({ error: "invalid score payload" }, 400, cors);

    const score = countries * 1000 - seconds; // computed here so it can't be forged

    const { data: existing, error: readErr } = await supabase
      .from("COTE")
      .select("name,score")
      .eq("name", name)
      .limit(1);
    if (readErr) return json({ error: "read failed" }, 500, cors);

    if (!existing || existing.length === 0) {
      const { error } = await supabase
        .from("COTE")
        .insert({ name, countries, seconds, score });
      if (error) return json({ error: "write failed" }, 500, cors);
    } else if (score > (existing[0].score as number)) {
      // Match the original game logic: one row per name, replaced on a better run.
      await supabase.from("COTE").delete().eq("name", name);
      const { error } = await supabase
        .from("COTE")
        .insert({ name, countries, seconds, score });
      if (error) return json({ error: "write failed" }, 500, cors);
    }

    const { data: lb } = await supabase
      .from("COTE")
      .select("*")
      .order("score", { ascending: false })
      .limit(10);
    return json({ ok: true, leaderboard: lb ?? [] }, 200, cors);
  }

  return json({ error: "unknown game" }, 400, cors);
});
