import { KanbanBoard } from "../components/KanbanBoard.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";

export default function Board() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8">
      <BackLink />
      <KanbanBoard />
    </main>
  );
}
