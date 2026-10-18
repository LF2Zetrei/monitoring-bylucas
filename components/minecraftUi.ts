// Styles partagés par les composants du panneau Minecraft.

export const LABEL = { color: "#1e2130", opacity: 0.4, fontSize: 10 } as const;
export const VALUE = { color: "#1e2130", fontSize: 13, fontWeight: 500 } as const;
export const SECTION = { borderTop: "1px solid #ece9e5", paddingTop: 14, marginTop: 14 } as const;
export const INPUT = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #d9d7d0",
  width: "100%",
  boxSizing: "border-box",
} as const;

export const BTN = (primary = false, danger = false, small = false) =>
  ({
    fontSize: small ? 11 : 12,
    padding: small ? "3px 10px" : "6px 14px",
    borderRadius: 6,
    border: primary || danger ? "none" : "1px solid #d9d7d0",
    background: danger ? "#d85a30" : primary ? "#1e2130" : "#fff",
    color: primary || danger ? "#fff" : "#1e2130",
    cursor: "pointer",
  }) as const;

// POST JSON → message d'erreur de l'API, ou null si tout va bien.
export async function postJson(url: string, body: unknown = {}): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error || "Failed";
  } catch {
    return "Failed";
  }
}
