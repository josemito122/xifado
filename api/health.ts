import { supabaseAdmin } from "../server/supabase.js";

export default async function health(_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  try {
    const { error } = await supabaseAdmin.from("xifado_state").select("id").eq("id", 1).maybeSingle();
    if (error) {
      res.status(503).json({ status: "degraded", database: "error", version: "1.0.0" });
      return;
    }
    res.status(200).json({ status: "ok", database: "ok", version: "1.0.0" });
  } catch {
    res.status(503).json({ status: "degraded", database: "error", version: "1.0.0" });
  }
}
