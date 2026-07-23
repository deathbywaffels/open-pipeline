import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { CandidateLeadCard } from "./CandidateLeadCard.jsx";

const baseLead = {
  id: 1,
  name: "Jane Dev",
  stage: "SOURCED",
  notes: "",
  jobPosting: { id: 10, title: "Backend Engineer" },
};

function renderCard(
  lead,
  { onStageChange = vi.fn(), onNotesChange = vi.fn() } = {},
) {
  render(
    <DndContext>
      <ul>
        <CandidateLeadCard
          lead={lead}
          onStageChange={onStageChange}
          onNotesChange={onNotesChange}
        />
      </ul>
    </DndContext>,
  );
  return { onStageChange, onNotesChange };
}

describe("CandidateLeadCard", () => {
  it("renders the candidate name and posting title", () => {
    renderCard(baseLead);
    expect(screen.getByText("Jane Dev")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
  });

  it("calls onStageChange when the stage select changes", async () => {
    const { onStageChange } = renderCard(baseLead);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/stage/i), "CONTACTED");

    expect(onStageChange).toHaveBeenCalledWith(1, "CONTACTED");
  });

  it("calls onNotesChange on blur only when notes actually changed", async () => {
    const { onNotesChange } = renderCard(baseLead);
    const user = userEvent.setup();

    const notesField = screen.getByLabelText(/notes/i);
    await user.type(notesField, "Strong React background");
    await user.tab();

    expect(onNotesChange).toHaveBeenCalledWith(1, "Strong React background");
  });

  it("does not call onNotesChange on blur when notes are unchanged", async () => {
    const { onNotesChange } = renderCard({ ...baseLead, notes: "Existing" });
    const notesField = screen.getByLabelText(/notes/i);
    notesField.focus();
    const user = userEvent.setup();
    await user.tab();

    expect(onNotesChange).not.toHaveBeenCalled();
  });
});
