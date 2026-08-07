/**
 * GeoJSON flood zones for Kolkata — used by the map overlay.
 * Ported from FloodSafe + extended with AI dataset areas.
 */
export const kolkataFloodZones = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Topsia / Tiljala", riskLevel: "high", baseScore: 90 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3850,22.5380],[88.3910,22.5380],[88.3910,22.5320],[88.3850,22.5320],[88.3850,22.5380]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Entally", riskLevel: "high", baseScore: 85 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3720,22.5530],[88.3790,22.5530],[88.3790,22.5470],[88.3720,22.5470],[88.3720,22.5530]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Behala / Sarsuna", riskLevel: "high", baseScore: 88 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3070,22.4850],[88.3200,22.4850],[88.3200,22.4720],[88.3070,22.4720],[88.3070,22.4850]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Kasba / Rajdanga", riskLevel: "medium", baseScore: 70 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3900,22.5130],[88.3980,22.5130],[88.3980,22.5060],[88.3900,22.5060],[88.3900,22.5130]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Maniktala / Ultadanga", riskLevel: "high", baseScore: 82 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3820,22.5840],[88.3920,22.5840],[88.3920,22.5750],[88.3820,22.5750],[88.3820,22.5840]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Chetla / Kalighat", riskLevel: "medium", baseScore: 65 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3380,22.5270],[88.3460,22.5270],[88.3460,22.5190],[88.3380,22.5190],[88.3380,22.5270]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Jadavpur", riskLevel: "high", baseScore: 91 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3700,22.4990],[88.3820,22.4990],[88.3820,22.4890],[88.3700,22.4890],[88.3700,22.4990]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Garia / Bansdroni", riskLevel: "high", baseScore: 88 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3880,22.4680],[88.4000,22.4680],[88.4000,22.4560],[88.3880,22.4560],[88.3880,22.4680]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Salt Lake Sector V", riskLevel: "medium", baseScore: 68 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.4280,22.5750],[88.4420,22.5750],[88.4420,22.5620],[88.4280,22.5620],[88.4280,22.5750]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "New Town", riskLevel: "medium", baseScore: 60 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.4550,22.6050],[88.4720,22.6050],[88.4720,22.5900],[88.4550,22.5900],[88.4550,22.6050]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Garden Reach / Metiabruz", riskLevel: "high", baseScore: 92 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3020,22.5260],[88.3140,22.5260],[88.3140,22.5140],[88.3020,22.5140],[88.3020,22.5260]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Dum Dum / Bangur", riskLevel: "medium", baseScore: 72 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.4180,22.6340],[88.4300,22.6340],[88.4300,22.6220],[88.4180,22.6220],[88.4180,22.6340]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Park Circus", riskLevel: "medium", baseScore: 63 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3650,22.5380],[88.3740,22.5380],[88.3740,22.5300],[88.3650,22.5300],[88.3650,22.5380]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Lake Gardens / Tollygunge", riskLevel: "medium", baseScore: 58 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3480,22.4970],[88.3620,22.4970],[88.3620,22.4860],[88.3480,22.4860],[88.3480,22.4970]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Park Street / Esplanade", riskLevel: "low", baseScore: 22 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3480,22.5570],[88.3610,22.5570],[88.3610,22.5490],[88.3480,22.5490],[88.3480,22.5570]]] }
    },
    {
      type: "Feature" as const,
      properties: { name: "Dhakuria / Gariahat", riskLevel: "low", baseScore: 35 },
      geometry: { type: "Polygon" as const, coordinates: [[[88.3630,22.5090],[88.3730,22.5090],[88.3730,22.5000],[88.3630,22.5000],[88.3630,22.5090]]] }
    },
  ]
};

export const RISK_COLORS = {
  high:   { fill: "#ef4444", stroke: "#dc2626", label: "High Risk" },
  medium: { fill: "#f97316", stroke: "#ea580c", label: "Moderate Risk" },
  low:    { fill: "#eab308", stroke: "#ca8a04", label: "Low Risk" },
  safe:   { fill: "#22c55e", stroke: "#16a34a", label: "Safe" },
};
