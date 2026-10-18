"use client";

import { useEffect, useRef, useState } from "react";

type McStatus = {
  status: string;
  health: string | null;
  startedAt: string | null;
  memory: string | null;
  players: string | null;
  runningSlug: string | null;
  config: { slug: string; fileId: string };
};

const COLOR: Record<string, string> = { running: "#639922", exited: "#888780", absent: "#d85a30" };
const LABEL = { color: "#1e2130", opacity: 0.4, fontSize: 10 } as const;
const VALUE = { color: "#1e2130", fontSize: 13, fontWeight: 500 } as const;
const BTN = (primary = false, danger = false) =>
  ({
    fontSize: 12,
    padding: "6px 14px",
    borderRadius: 6,
    border: primary ? "none" : "1px solid #d9d7d0",
    background: danger ? "#d85a30" : primary ? "#1e2130" : "#fff",
    color: primary || danger ? "#fff" : "#1e2130",
    cursor: "pointer",
  }) as const;

function uptime(startedAt: string | null) {
  if (!startedAt) return "—";
  const min = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (min < 60) return `${min} min`;
  return min < 1440 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${Math.floor(min / 1440)} j`;
}

export default function MinecraftPanel() {
  const [s, setS] = useState<McStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [fileId, setFileId] = useState("");
  const [clean, setClean] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formInit = useRef(false);

  async function refresh() {
    try {
      const data: McStatus = await (await fetch("/api/minecraft")).json();
      setS(data);
      if (!formInit.current) {
        setSlug(data.config.slug);
        setFileId(data.config.fileId);
        formInit.current = true;
      }
    } catch {}
  }

  useEffect(() => {
    // Même principe que app/page.tsx : pas de setState synchrone dans l'effet.
    Promise.resolve().then(refresh);
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  async function post(url: string, body: unknown, label: string, okMsg: string) {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? okMsg : data.error || "Échec");
    } catch {
      setMsg("Échec");
    } finally {
      setBusy(null);
      refresh();
    }
  }

  const power = (action: string, okMsg: string) => post("/api/minecraft/power", { action }, action, okMsg);

  function applyModpack() {
    const warn = clean
      ? "Le monde sera sauvegardé, puis mods/ et config/ supprimés avant de réinstaller le modpack. Continuer ?"
      : "Le serveur va être recréé avec ce modpack (mods existants conservés). Continuer ?";
    if (!confirm(warn)) return;
    post("/api/minecraft/modpack", { slug, fileId, clean }, "modpack", "Modpack appliqué, le serveur redémarre (installation : quelques minutes)");
  }

  function uploadWorld(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) return setMsg("Choisis un fichier .zip");
    if (!confirm(`Remplacer le monde actuel par "${file.name}" ? L'ancien est sauvegardé (5 dernières sauvegardes conservées) et le serveur sera redémarré.`)) return;
    setMsg(null);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", "/api/minecraft/world/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = async () => {
      setProgress(null);
      if (xhr.status !== 200) {
        setMsg(JSON.parse(xhr.responseText || "{}").error || "Échec de l'envoi");
        return;
      }
      await post("/api/minecraft/world/import", {}, "import", "Monde remplacé, le serveur redémarre");
    };
    xhr.onerror = () => {
      setProgress(null);
      setMsg("Échec de l'envoi");
    };
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.send(file);
  }

  const running = s?.status === "running";
  const input = { fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid #d9d7d0", width: "100%", boxSizing: "border-box" } as const;
  const dirty = s && s.runningSlug && s.runningSlug !== s.config.slug;

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLOR[s?.status ?? "absent"] || "#888780" }} />
          <span style={{ ...VALUE }}>Homestead</span>
          <span style={{ ...LABEL, fontSize: 11 }}>{s ? s.status : "…"}{s?.health ? ` · ${s.health}` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {running ? (
            <>
              <button style={BTN()} disabled={!!busy} onClick={() => power("restart", "Redémarré")}>
                {busy === "restart" ? "…" : "Redémarrer"}
              </button>
              <button
                style={BTN(false, true)}
                disabled={!!busy}
                onClick={() => confirm("Arrêter le serveur ? Les joueurs connectés seront déconnectés.") && power("stop", "Arrêté")}
              >
                {busy === "stop" ? "Arrêt…" : "Arrêter"}
              </button>
            </>
          ) : (
            <button style={BTN(true)} disabled={!!busy} onClick={() => power("start", "Démarrage en cours")}>
              {busy === "start" ? "…" : "Démarrer"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <div><div style={LABEL}>JOUEURS</div><div style={VALUE}>{s?.players ?? "—"}</div></div>
        <div><div style={LABEL}>MÉMOIRE</div><div style={VALUE}>{s?.memory?.split(" / ")[0] ?? "—"}</div></div>
        <div><div style={LABEL}>UPTIME</div><div style={VALUE}>{running ? uptime(s!.startedAt) : "—"}</div></div>
        <div><div style={LABEL}>MODPACK</div><div style={VALUE}>{s?.runningSlug ?? "—"}</div></div>
      </div>

      <div style={{ borderTop: "1px solid #ece9e5", paddingTop: 14, marginBottom: 14 }}>
        <div style={{ ...LABEL, marginBottom: 8 }}>CHANGER DE MODPACK</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
          <input style={input} value={slug} onChange={(e) => setSlug(e.target.value.trim())} placeholder="slug CurseForge (ex: homestead-cozy)" />
          <input style={input} value={fileId} onChange={(e) => setFileId(e.target.value.trim())} placeholder="ID fichier (optionnel)" />
        </div>
        <label style={{ fontSize: 12, color: "#1e2130", display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} />
          Nettoyer mods/ et config/ (recommandé si c&apos;est un autre modpack)
        </label>
        <button style={BTN(true)} disabled={!!busy || !slug} onClick={applyModpack}>
          {busy === "modpack" ? "Application…" : "Appliquer"}
        </button>
        {dirty && <span style={{ ...LABEL, fontSize: 11, marginLeft: 10 }}>en cours : {s!.runningSlug}</span>}
      </div>

      <div style={{ borderTop: "1px solid #ece9e5", paddingTop: 14 }}>
        <div style={{ ...LABEL, marginBottom: 8 }}>MONDE</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/api/minecraft/world/download" style={{ ...BTN(), textDecoration: "none", display: "inline-block" }}>
            Télécharger le monde (.zip)
          </a>
          <button style={BTN()} disabled={!!busy || progress !== null} onClick={() => fileRef.current?.click()}>
            {progress !== null ? `Envoi ${progress}%` : busy === "import" ? "Import…" : "Remplacer le monde…"}
          </button>
          <input ref={fileRef} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWorld(f); e.target.value = ""; }} />
        </div>
        <div style={{ ...LABEL, fontSize: 11, marginTop: 8 }}>
          Le téléchargement est une copie à chaud (sauvegardes auto suspendues quelques secondes).
        </div>
      </div>

      {msg && <div style={{ color: "#1e2130", fontSize: 12, marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
