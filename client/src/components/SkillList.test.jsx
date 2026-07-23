import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillList } from "./SkillList.jsx";

describe("SkillList", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("loads and displays existing skills", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, name: "React" }],
    });

    render(<SkillList />);

    expect(await screen.findByText("React")).toBeInTheDocument();
  });

  it("adds a new skill", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 2, name: "SQL" }),
      }); // add
    const user = userEvent.setup();

    render(<SkillList />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText(/add a skill/i), "SQL");
    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(await screen.findByText("SQL")).toBeInTheDocument();
  });

  it("removes a skill", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: "React" }],
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // delete
    const user = userEvent.setup();

    render(<SkillList />);
    await screen.findByText("React");

    await user.click(screen.getByRole("button", { name: /remove react/i }));

    await waitFor(() =>
      expect(screen.queryByText("React")).not.toBeInTheDocument(),
    );
  });
});
