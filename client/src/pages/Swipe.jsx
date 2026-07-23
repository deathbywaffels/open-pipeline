import { SwipeDeck } from "../components/SwipeDeck.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";

export default function Swipe() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 lg:max-w-lg">
      <BackLink />
      <SwipeDeck />
    </main>
  );
}
