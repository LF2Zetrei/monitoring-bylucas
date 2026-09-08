"use client";

import { useEffect, useRef, useState } from "react";

export type ServiceItem = {
  name: string;
  type: string;
  port?: number;
  status: string;
  memoryMB: number | null;
  subdomain?: string;
  certExists: boolean | null;
};

type LogEntry = {
  time: string | null;
  priority: string;
  message: string;
};

const STATUS_COLOR: Record<string, string> = {
  active: "#639922",
  failed: "#d85a30",
  inactive: "#888780",
};

// Priorités syslog : 0-3 = erreur/critique, 4 = warning, 5+ = info
function levelColor(priority: string) {
  const p = parseInt(priority, 10);
  if (p <= 3) return "#993c1d";
  if (p === 4) return "#854f0b";
  return "rgba(30,33,48,0.4)";
}

export default function ServiceAccordion({ service }: { service: ServiceItem }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Coupe le flux en direct si l'accordéon se referme ou si le composant
  // disparaît - sans ça, journalctl -f continuerait de tourner côté serveur
  // pour un panneau que plus personne ne regarde.
  useEffect(() => {
    if (!open && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setLive(false);
    }
    return () => {
      eventSourceRef.current?.close();
    };
  }, [open]);

  function toggleLive(e: React.MouseEvent) {
    e.stopPropagation();
    if (live) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setLive(false);
      return;
    }
    setLiveLogs([]);
    const es = new EventSource(`/api/services/${service.name}/logs/stream`);
    es.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLiveLogs((prev) => [entry, ...prev].slice(0, 100)); // plafonne à 100 lignes
    };
    es.onerror = () => {
      es.close();
      setLive(false);
    };
    eventSourceRef.current = es;
    setLive(true);
  }

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && logs === null) {
      setLoadingLogs(true);
      try {
        const res = await fetch(`/api/services/${service.name}/logs?level=warning`);
        setLogs(await res.json());
      } catch {
        setLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    }
  }

  async function handleRestart(e: React.MouseEvent) {
    e.stopPropagation();
    setRestarting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/services/${service.name}/restart`, { method: "POST" });
      setActionMessage(res.ok ? "Redémarré" : "Échec du redémarrage");
    } catch {
      setActionMessage("Échec du redémarrage");
    } finally {
      setRestarting(false);
    }
  }

  async function handleRegenerateCert(e: React.MouseEvent) {
    e.stopPropagation();
    if (!service.subdomain) return;
    setRegenerating(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/certbot/${service.subdomain}/regenerate`, { method: "POST" });
      setActionMessage(res.ok ? "Certificat régénéré" : "Échec de la génération du certificat");
    } catch {
      setActionMessage("Échec de la génération du certificat");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div style={{ background: "#ffffff", borderRadius: 10, overflow: "hidden" }}>
      <div
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: STATUS_COLOR[service.status] || "#888780",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#1e2130", fontSize: 13, fontWeight: 500 }}>{service.name}</span>
          <span style={{ color: "#1e2130", opacity: 0.4, fontSize: 11 }}>
            {service.type}
            {service.port ? ` · :${service.port}` : ""}
          </span>
        </div>
        <span style={{ color: "#1e2130", opacity: 0.4, fontSize: 12, transform: open ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </div>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #ece9e5" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "14px 0" }}>
            <div>
              <div style={{ color: "#1e2130", opacity: 0.4, fontSize: 10 }}>MÉMOIRE</div>
              <div style={{ color: "#1e2130", fontSize: 13, fontWeight: 500 }}>
                {service.memoryMB !== null ? `${service.memoryMB} Mo` : "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#1e2130", opacity: 0.4, fontSize: 10 }}>STATUT</div>
              <div style={{ color: "#1e2130", fontSize: 13, fontWeight: 500 }}>{service.status}</div>
            </div>
            <div>
              <div style={{ color: "#1e2130", opacity: 0.4, fontSize: 10 }}>DOMAINE</div>
              <div style={{ color: "#1e2130", fontSize: 13, fontWeight: 500 }}>
                {service.subdomain || "—"}
              </div>
            </div>
          </div>

          {service.type !== "static" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#1e2130", opacity: 0.4, fontSize: 10 }}>LOGS</span>
                <button
                  onClick={toggleLive}
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: live ? "none" : "1px solid #d9d7d0",
                    background: live ? "#e1cf80" : "#fff",
                    color: "#1e2130",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: live ? "#639922" : "#c3c2b7",
                      display: "inline-block",
                    }}
                  />
                  {live ? "Direct" : "Voir en direct"}
                </button>
              </div>

              <div
                style={{
                  background: "#ece9e5",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  lineHeight: 1.7,
                  marginBottom: 14,
                  minHeight: 20,
                  maxHeight: 240,
                  overflowY: "auto",
                }}
              >
                {live && liveLogs.length === 0 && (
                  <div style={{ color: "#1e2130", opacity: 0.3 }}>En attente de nouvelles lignes…</div>
                )}
                {live &&
                  liveLogs.map((log, i) => (
                    <div key={i} style={{ color: levelColor(log.priority) }}>
                      {log.time ? new Date(log.time).toLocaleTimeString("fr-FR") : "—"} &nbsp;{log.message}
                    </div>
                  ))}
                {!live && loadingLogs && <div style={{ color: "#1e2130", opacity: 0.3 }}>Chargement des logs…</div>}
                {!live && !loadingLogs && logs !== null && logs.length === 0 && (
                  <div style={{ color: "#1e2130", opacity: 0.3 }}>Aucun avertissement ou erreur récent</div>
                )}
                {!live &&
                  !loadingLogs &&
                  logs?.map((log, i) => (
                    <div key={i} style={{ color: levelColor(log.priority) }}>
                      {log.time ? new Date(log.time).toLocaleTimeString("fr-FR") : "—"} &nbsp;{log.message}
                    </div>
                  ))}
              </div>
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {service.type !== "static" && (
              <button
                onClick={handleRestart}
                disabled={restarting}
                style={{
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid #d9d7d0",
                  background: "#fff",
                  color: "#1e2130",
                  cursor: restarting ? "default" : "pointer",
                }}
              >
                {restarting ? "Redémarrage…" : "Redémarrer"}
              </button>
            )}

            {/* N'apparaît QUE si le certificat n'existe plus - jamais affiché
                si tout va bien, pour éviter tout clic accidentel inutile. */}
            {service.certExists === false && service.subdomain && (
              <button
                onClick={handleRegenerateCert}
                disabled={regenerating}
                style={{
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: "#edb7b3",
                  color: "#4a1b0c",
                  cursor: regenerating ? "default" : "pointer",
                }}
              >
                {regenerating ? "Génération…" : "Régénérer le certificat SSL"}
              </button>
            )}

            {actionMessage && (
              <span style={{ color: "#1e2130", opacity: 0.5, fontSize: 12 }}>{actionMessage}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
