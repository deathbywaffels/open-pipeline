import { MapView } from "../components/MapView.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";

export default function Map() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackLink />
      <MapView />
    </main>
  );
}
