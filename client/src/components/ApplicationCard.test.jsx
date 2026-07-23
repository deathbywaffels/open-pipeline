import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { ApplicationCard } from "./ApplicationCard.jsx";

const baseApplication = {
  id: 1,
  stage: "LIKED",
  isStale: false,
  jobListing: { id: 10, title: "Backend Engineer", company: "Acme" },
};

function renderCard(application, onStageChange = vi.fn()) {
  render(
    <DndContext>
      <ul>
        <ApplicationCard
          application={application}
          onStageChange={onStageChange}
        />
      </ul>
    </DndContext>,
  );
  return onStageChange;
}

describe("ApplicationCard", () => {
  it("renders the job title and company", () => {
    renderCard(baseApplication);
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("shows a stale badge when isStale is true", () => {
    renderCard({ ...baseApplication, isStale: true });
    expect(screen.getByText(/no response in 14\+ days/i)).toBeInTheDocument();
  });

  it("does not show a stale badge when isStale is false", () => {
    renderCard(baseApplication);
    expect(
      screen.queryByText(/no response in 14\+ days/i),
    ).not.toBeInTheDocument();
  });

  it("calls onStageChange when the stage select changes", async () => {
    const onStageChange = vi.fn();
    renderCard(baseApplication, onStageChange);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/stage/i), "APPLIED");

    expect(onStageChange).toHaveBeenCalledWith(1, "APPLIED");
  });

  it("shows a rejection-letter upload control only when the stage is REJECTED", () => {
    renderCard({ ...baseApplication, stage: "REJECTED" });
    expect(screen.getByText(/upload rejection letter/i)).toBeInTheDocument();
  });

  it("does not show the rejection-letter upload control for other stages", () => {
    renderCard(baseApplication);
    expect(
      screen.queryByText(/upload rejection letter/i),
    ).not.toBeInTheDocument();
  });

  it("uploads a rejection letter and shows the filename once done", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, filename: "letter.pdf" }),
    });
    renderCard({ ...baseApplication, stage: "REJECTED" });
    const user = userEvent.setup();

    const file = new File(["letter"], "letter.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, file);

    expect(await screen.findByText("letter.pdf")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/applications/1/rejection-letter",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
