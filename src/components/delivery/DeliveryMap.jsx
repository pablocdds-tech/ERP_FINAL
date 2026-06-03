import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Cores por status de pedido/entrega
const COR_STATUS = {
  pronto: "#10b981",
  em_preparo: "#f59e0b",
  novo: "#3b82f6",
  em_rota: "#8b5cf6",
  entregue: "#059669",
  problema: "#ef4444",
  sem_coord: "#94a3b8",
};

function dot(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const lojaIcon = L.divIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:6px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">🏠</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function DeliveryMap({ origem, pedidos = [], rotaCoords = [], selecionados = [], onMarkerClick }) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const center = origem && origem.lat != null ? [origem.lat, origem.lng] : [-23.55, -46.63];
    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }, [origem]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const bounds = [];

    if (origem && origem.lat != null) {
      L.marker([origem.lat, origem.lng], { icon: lojaIcon })
        .bindPopup("<b>Loja / Origem</b>")
        .addTo(group);
      bounds.push([origem.lat, origem.lng]);
    }

    pedidos.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const sel = selecionados.includes(p.id);
      const cor = sel ? "#2563eb" : (COR_STATUS[p.status_pedido] || COR_STATUS.novo);
      const m = L.marker([p.latitude, p.longitude], { icon: dot(cor) })
        .bindPopup(
          `<b>#${p.numero_pedido}</b> — ${p.cliente_nome}<br/>${p.bairro || ""}<br/>R$ ${Number(p.total || 0).toFixed(2)}`
        )
        .addTo(group);
      if (onMarkerClick) m.on("click", () => onMarkerClick(p));
      bounds.push([p.latitude, p.longitude]);
    });

    // Linha da rota (sequência)
    if (rotaCoords.length > 1) {
      L.polyline(rotaCoords, { color: "#2563eb", weight: 3, opacity: 0.7 }).addTo(group);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
  }, [origem, pedidos, rotaCoords, selecionados, onMarkerClick]);

  return <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden bg-slate-100" />;
}