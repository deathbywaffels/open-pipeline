import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned } from "lucide-react";
import { STAGE_LABELS } from "../lib/applicationStages.js";

const PIN_HEX = { grey: "#9ca3af", blue: "#8b5cf6", green: "#22c55e" };
const DEFAULT_CENTER = [20, 0];

const LEGEND = [
  { color: "blue", label: "Liked, not yet applied" },
  { color: "green", label: "Applied or further" },
  { color: "grey", label: "Rejected" },
];

export function MapView() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/job-listings/map", { credentials: "include" })
      .then((res) => res.json())
      .then(setPins)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (pins.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <MapPinned className="h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">
          No geocoded jobs to show yet — pins appear here once you've liked a
          job with a resolved location.
        </p>
      </div>
    );
  }

  const center = [pins[0].latitude, pins[0].longitude];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm">
        {LEGEND.map((item) => (
          <span key={item.color} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: PIN_HEX[item.color] }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
        <MapContainer
          center={center || DEFAULT_CENTER}
          zoom={4}
          style={{ height: "min(70vh, 700px)", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pins.map((pin) => (
            <CircleMarker
              key={pin.id}
              center={[pin.latitude, pin.longitude]}
              radius={10}
              pathOptions={{
                color: PIN_HEX[pin.pinColor],
                fillColor: PIN_HEX[pin.pinColor],
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <strong>{pin.title}</strong>
                <br />
                {pin.company}
                <br />
                {STAGE_LABELS[pin.stage]}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
