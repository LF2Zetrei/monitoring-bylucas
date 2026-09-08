"use client";

import { useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard";
import ServiceAccordion, { ServiceItem } from "@/components/ServiceAccordion";
import InfraTags from "@/components/InfraTags";

type Infra = {
  ramPercent: number;
  ramTotalMB: number;
  diskPercent: number;
};

type InfraServiceItem = {
  name: string;
  kind: "systemd" | "docker";
  status: string;
};

const REFRESH_INTERVAL_MS = 15000;

export default function Dashboard() {
  const [infra, setInfra] = useState<Infra | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [infraServices, setInfraServices] = useState<InfraServiceItem[]>([]);

  async function refresh() {
    const [infraRes, servicesRes, infraServicesRes] = await Promise.all([
      fetch("/api/infra"),
      fetch("/api/services"),
      fetch("/api/infra-services"),
    ]);
    setInfra(await infraRes.json());
    setServices(await servicesRes.json());
    setInfraServices(await infraServicesRes.json());
  }

  useEffect(() => {
    // refresh() met à jour l'état de façon asynchrone (après les fetch) ;
    // on la déclenche via une microtask plutôt que de l'appeler en direct,
    // pour que l'effet ne fasse que "démarrer" la synchronisation, jamais
    // de setState synchrone dans son corps.
    Promise.resolve().then(refresh);
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const alertsCount = services.filter((s) => s.status !== "active").length;

  return (
    <main
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#ece9e5",
        minHeight: "100vh",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.5rem" }}>
          <span style={{ color: "#1e2130", fontSize: 20, fontWeight: 600 }}>Monitoring</span>
          <span style={{ color: "#1e2130", opacity: 0.5, fontSize: 12 }}>bylucas.eu</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.75rem" }}>
          <MetricCard label="RAM" value={infra ? `${infra.ramPercent}%` : "—"} percent={infra?.ramPercent} />
          <MetricCard label="Disque" value={infra ? `${infra.diskPercent}%` : "—"} percent={infra?.diskPercent} />
          <MetricCard label="Services" value={`${services.length - alertsCount} / ${services.length}`} />
          <MetricCard label="Alertes" value={String(alertsCount)} accent={alertsCount > 0} />
        </div>

        <div style={{ color: "#1e2130", opacity: 0.5, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
          APPLICATIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.75rem" }}>
          {services.map((s) => (
            <ServiceAccordion key={s.name} service={s} />
          ))}
        </div>

        <div style={{ color: "#1e2130", opacity: 0.5, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
          INFRASTRUCTURE
        </div>
        <InfraTags items={infraServices} />
      </div>
    </main>
  );
}
