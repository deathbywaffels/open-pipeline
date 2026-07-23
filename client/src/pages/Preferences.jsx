import { PreferenceProfile } from "../components/PreferenceProfile.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";

export default function Preferences() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackLink />

      <h1 className="mb-4 text-xl font-extrabold text-slate-800">
        What you don't want
      </h1>
      <PreferenceProfile />
    </main>
  );
}
