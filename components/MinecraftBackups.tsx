"use client";

import { useState } from "react";
import { BTN, LABEL, SECTION } from "./minecraftUi";

export type Backup = {
  id: string;
  slug: string;
  fileId: string;
  reason: string;
  createdAt: string;
  size: number;
};

const REASON: Record<string, string> = {
  manual: "Manual save",
  "before-import": "Before world upload",
  "before-new-world": "Before new world",
  "before-modpack-change": "Before modpack change",
  "before-restore": "Before restore",
};

function formatSize(bytes: number) {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

type Props = {
  backups: Backup[] | "error" | null;
  runningSlug: string | null;
  busy: string | null;
  run: (label: string, url: string, body: unknown, okMsg: string) => void;
};

// Sauvegardes du monde groupées par modpack ; le modpack en cours en premier.
export default function MinecraftBackups({ backups, runningSlug, busy, run }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const groups = new Map<string, Backup[]>();
  for (const b of Array.isArray(backups) ? backups : []) groups.set(b.slug, [...(groups.get(b.slug) ?? []), b]);
  const slugs = [...groups.keys()].sort((a, b) =>
    a === runningSlug ? -1 : b === runningSlug ? 1 : a.localeCompare(b),
  );

  function restore(b: Backup) {
    const other = b.slug !== runningSlug && b.slug !== "unknown";
    const warn =
      `Restore the world saved on ${formatDate(b.createdAt)}?\n\n` +
      "The current world will be saved first, then the server restarts." +
      (other ? `\n\nThis world belongs to the modpack "${b.slug}": the server will switch to it and reinstall its mods (a few minutes).` : "");
    if (confirm(warn)) run("restore", "/api/minecraft/backups/restore", { id: b.id }, other ? `World restored, switching to ${b.slug}` : "World restored, server restarting");
  }

  function remove(b: Backup) {
    if (confirm(`Delete the save from ${formatDate(b.createdAt)} (${b.slug})? This cannot be undone.`))
      run("delete", "/api/minecraft/backups/delete", { id: b.id }, "Save deleted");
  }

  return (
    <div style={SECTION}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={LABEL}>SAVED WORLDS</div>
        <button style={BTN(false, false, true)} disabled={!!busy} onClick={() => run("save", "/api/minecraft/backups", {}, "World saved")}>
          {busy === "save" ? "Saving…" : "Save current world"}
        </button>
      </div>

      {backups === null && <div style={{ ...LABEL, fontSize: 11 }}>Loading…</div>}
      {backups === "error" && <div style={{ ...LABEL, fontSize: 11 }}>Could not load saved worlds.</div>}
      {Array.isArray(backups) && backups.length === 0 && <div style={{ ...LABEL, fontSize: 11 }}>No saved worlds yet.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slugs.map((slug) => {
          const items = groups.get(slug)!;
          const expanded = open[slug] ?? slug === runningSlug;
          return (
            <div key={slug} style={{ border: "1px solid #ece9e5", borderRadius: 8 }}>
              <button
                onClick={() => setOpen({ ...open, [slug]: !expanded })}
                style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", boxSizing: "border-box", padding: "8px 10px", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ fontSize: 12, color: "#1e2130", fontWeight: 500 }}>
                  {slug}
                  {slug === runningSlug && <span style={{ ...LABEL, fontSize: 11, marginLeft: 8 }}>current modpack</span>}
                </span>
                <span style={{ ...LABEL, fontSize: 11 }}>
                  {items.length} save{items.length > 1 ? "s" : ""} {expanded ? "▴" : "▾"}
                </span>
              </button>
              {expanded &&
                items.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderTop: "1px solid #ece9e5" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#1e2130" }}>{formatDate(b.createdAt)}</div>
                      <div style={{ ...LABEL, fontSize: 11 }}>
                        {REASON[b.reason] ?? b.reason} · {formatSize(b.size)}
                        {b.fileId ? ` · file ${b.fileId}` : ""}
                      </div>
                    </div>
                    <button style={BTN(false, false, true)} disabled={!!busy} onClick={() => restore(b)}>
                      Restore
                    </button>
                    <button style={{ ...BTN(false, false, true), color: "#d85a30" }} disabled={!!busy} onClick={() => remove(b)}>
                      Delete
                    </button>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
      <div style={{ ...LABEL, fontSize: 11, marginTop: 8 }}>
        A save is made automatically before each world replacement (5 kept per modpack). Manual saves are never deleted automatically.
      </div>
    </div>
  );
}
