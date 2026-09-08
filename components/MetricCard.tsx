type MetricCardProps = {
  label: string;
  value: string;
  percent?: number;
  accent?: boolean;
};

export default function MetricCard({ label, value, percent, accent }: MetricCardProps) {
  return (
    <div
      style={{
        background: accent ? '#edb7b3' : '#ffffff',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ color: accent ? '#4a1b0c' : '#1e2130', opacity: 0.5, fontSize: 11, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: accent ? '#4a1b0c' : '#1e2130', fontSize: 22, fontWeight: 600 }}>
        {value}
      </div>
      {percent !== undefined && (
        <div style={{ background: '#ece9e5', height: 5, borderRadius: 3, marginTop: 8 }}>
          <div
            style={{
              background: '#e1cf80',
              width: `${percent}%`,
              height: 5,
              borderRadius: 3,
            }}
          />
        </div>
      )}
    </div>
  );
}
