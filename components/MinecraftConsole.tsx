"use client";

import { useEffect, useRef, useState } from "react";
import { INPUT, LABEL, SECTION } from "./minecraftUi";

type Line = { kind: "cmd" | "out" | "err"; text: string };

// Raccourcis : remplissent la saisie, rien n'est envoyé sans Entrée.
const SHORTCUTS = ["list", "say ", "time set day", "weather clear", "whitelist add ", "op ", "gamemode creative ", "tp ", "save-all", "help"];
const MAX_LINES = 200;

export default function MinecraftConsole({ running }: { running: boolean }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const outRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [lines]);

  function push(...l: Line[]) {
    setLines((prev) => [...prev, ...l].slice(-MAX_LINES));
  }

  async function send() {
    const command = input.trim();
    if (!command || pending) return;
    setInput("");
    setCursor(-1);
    setHistory((h) => [command, ...h.filter((c) => c !== command)].slice(0, 50));
    push({ kind: "cmd", text: command });
    setPending(true);
    try {
      const res = await fetch("/api/minecraft/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) push({ kind: "out", text: data.output || "(no output)" });
      else push({ kind: "err", text: data.error || "Failed" });
    } catch {
      push({ kind: "err", text: "Failed" });
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send();
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(-1, Math.min(history.length - 1, cursor + (e.key === "ArrowUp" ? 1 : -1)));
      setCursor(next);
      setInput(next === -1 ? "" : history[next]);
    }
  }

  const COLOR = { cmd: "#9fe870", out: "#e8e6e1", err: "#f0997b" };

  return (
    <div style={SECTION}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={LABEL}>CONSOLE</div>
        {lines.length > 0 && (
          <button onClick={() => setLines([])} style={{ all: "unset", cursor: "pointer", ...LABEL, fontSize: 11 }}>
            Clear
          </button>
        )}
      </div>
      <div
        ref={outRef}
        style={{
          background: "#1e2130",
          borderRadius: 8,
          padding: 10,
          height: 180,
          overflowY: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {lines.length === 0 && (
          <div style={{ color: "#e8e6e1", opacity: 0.4 }}>
            {running ? "Type a server command, e.g. list (no leading slash needed)." : "The server is not running."}
          </div>
        )}
        {lines.map((l, i) => (
          <div key={i} style={{ color: COLOR[l.kind] }}>
            {l.kind === "cmd" ? `> ${l.text}` : l.text}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          ref={inputRef}
          style={{ ...INPUT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          value={input}
          maxLength={256}
          disabled={!running}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={running ? "command…" : "server stopped"}
        />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {SHORTCUTS.map((s) => (
          <button
            key={s}
            disabled={!running}
            onClick={() => {
              setInput(s);
              inputRef.current?.focus();
            }}
            style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, border: "1px solid #d9d7d0", background: "#fff", color: "#1e2130", cursor: "pointer" }}
          >
            {s.trim()}
          </button>
        ))}
      </div>
    </div>
  );
}
