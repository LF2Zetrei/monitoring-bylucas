"use client";

import { useEffect, useRef, useState } from "react";
import MinecraftBackups, { Backup } from "./MinecraftBackups";
import MinecraftConsole from "./MinecraftConsole";
import { BTN, INPUT, LABEL, SECTION, VALUE, postJson } from "./minecraftUi";

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

function uptime(startedAt: string | null) {
  if (!startedAt) return "—";
  const min = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (min < 60) return `${min} min`;
  return min < 1440 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${Math.floor(min / 1440)} d`;
}

export default function MinecraftPanel() {
  const [s, setS] = useState<McStatus | null>(null);
  const [backups, setBackups] = useState<Backup[] | "error" | null>(null);
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
      const [statusRes, backupsRes] = await Promise.all([fetch("/api/minecraft"), fetch("/api/minecraft/backups")]);
      const data: McStatus = await statusRes.json();
      setS(data);
      setBackups(backupsRes.ok ? await backupsRes.json() : "error");
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

  // Une action à la fois pour tout le panneau (le script serveur a aussi un verrou).
  async function run(label: string, url: string, body: unknown, okMsg: string) {
    setBusy(label);
    setMsg(null);
    const error = await postJson(url, body);
    setMsg(error ?? okMsg);
    setBusy(null);
    refresh();
  }

  const power = (action: string, okMsg: string) => run(action, "/api/minecraft/power", { action }, okMsg);

  function applyModpack() {
    const warn = clean
      ? "The world will be saved, then mods/ and config/ deleted before installing the modpack. Continue?"
      : "The server will be recreated with this modpack (existing mods kept). Continue?";
    if (!confirm(warn)) return;
    run("modpack", "/api/minecraft/modpack", { slug, fileId, clean }, "Modpack applied, server restarting (install takes a few minutes)");
  }

  function newWorld() {
    if (!confirm("Generate a new random world? The current world is saved first (see Saved worlds) and the server restarts.")) return;
    run("new-world", "/api/minecraft/world/new", {}, "New world generating, server restarting");
  }

  function uploadWorld(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) return setMsg("Pick a .zip file");
    if (!confirm(`Replace the current world with "${file.name}"? The current world is saved first and the server restarts.`)) return;
    setMsg(null);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", "/api/minecraft/world/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = async () => {
      setProgress(null);
      if (xhr.status !== 200) {
        let error = "Upload failed";
        try {
          error = JSON.parse(xhr.responseText).error || error;
        } catch {}
        setMsg(error);
        return;
      }
      await run("import", "/api/minecraft/world/import", {}, "World replaced, server restarting");
    };
    xhr.onerror = () => {
      setProgress(null);
      setMsg("Upload failed");
    };
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.send(file);
  }

  const running = s?.status === "running";
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
              <button style={BTN()} disabled={!!busy} onClick={() => power("restart", "Restarted")}>
                {busy === "restart" ? "…" : "Restart"}
              </button>
              <button
                style={BTN(false, true)}
                disabled={!!busy}
                onClick={() => confirm("Stop the server? Connected players will be disconnected.") && power("stop", "Stopped")}
              >
                {busy === "stop" ? "Stopping…" : "Stop"}
              </button>
            </>
          ) : (
            <button style={BTN(true)} disabled={!!busy} onClick={() => power("start", "Starting")}>
              {busy === "start" ? "…" : "Start"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <div><div style={LABEL}>PLAYERS</div><div style={VALUE}>{s?.players ?? "—"}</div></div>
        <div><div style={LABEL}>MEMORY</div><div style={VALUE}>{s?.memory?.split(" / ")[0] ?? "—"}</div></div>
        <div><div style={LABEL}>UPTIME</div><div style={VALUE}>{running ? uptime(s!.startedAt) : "—"}</div></div>
        <div><div style={LABEL}>MODPACK</div><div style={VALUE}>{s?.runningSlug ?? "—"}</div></div>
      </div>

      <MinecraftConsole running={running} />

      <div style={SECTION}>
        <div style={{ ...LABEL, marginBottom: 8 }}>CHANGE MODPACK</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
          <input style={INPUT} value={slug} onChange={(e) => setSlug(e.target.value.trim())} placeholder="CurseForge slug (e.g. homestead-cozy)" />
          <input style={INPUT} value={fileId} onChange={(e) => setFileId(e.target.value.trim())} placeholder="File ID (optional)" />
        </div>
        <label style={{ fontSize: 12, color: "#1e2130", display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} />
          Clean mods/ and config/ (recommended when switching to another modpack)
        </label>
        <button style={BTN(true)} disabled={!!busy || !slug} onClick={applyModpack}>
          {busy === "modpack" ? "Applying…" : "Apply"}
        </button>
        {dirty && <span style={{ ...LABEL, fontSize: 11, marginLeft: 10 }}>running: {s!.runningSlug}</span>}
      </div>

      <div style={SECTION}>
        <div style={{ ...LABEL, marginBottom: 8 }}>WORLD</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/api/minecraft/world/download" style={{ ...BTN(), textDecoration: "none", display: "inline-block" }}>
            Download world (.zip)
          </a>
          <button style={BTN()} disabled={!!busy || progress !== null} onClick={() => fileRef.current?.click()}>
            {progress !== null ? `Uploading ${progress}%` : busy === "import" ? "Importing…" : "Replace world…"}
          </button>
          <button style={BTN()} disabled={!!busy || progress !== null} onClick={newWorld}>
            {busy === "new-world" ? "Generating…" : "New random world"}
          </button>
          <input ref={fileRef} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWorld(f); e.target.value = ""; }} />
        </div>
        <div style={{ ...LABEL, fontSize: 11, marginTop: 8 }}>
          The download is a hot copy (autosave paused for a few seconds).
        </div>
      </div>

      <MinecraftBackups backups={backups} runningSlug={s?.runningSlug ?? null} busy={busy} run={run} />

      {msg && <div style={{ color: "#1e2130", fontSize: 12, marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
