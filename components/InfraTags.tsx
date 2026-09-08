type InfraItem = {
  name: string;
  kind: "systemd" | "docker";
  status: string;
};

export default function InfraTags({ items }: { items: InfraItem[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <span
          key={item.name}
          style={{
            color: "#1e2130",
            fontSize: 12,
            background: item.status === "active" || item.status === "running" ? "#ffffff" : "#faece7",
            padding: "6px 12px",
            borderRadius: 8,
          }}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
}
