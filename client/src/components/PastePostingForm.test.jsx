import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PastePostingForm } from "./PastePostingForm.jsx";

describe("PastePostingForm", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("submits the form and parses comma-separated required skills", async () => {
    const createdPosting = { id: 1, title: "Backend Engineer" };
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createdPosting,
    });
    const onCreated = vi.fn();
    const user = userEvent.setup();

    render(<PastePostingForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/^title$/i), "Backend Engineer");
    await user.type(screen.getByLabelText(/description/i), "Build APIs.");
    await user.type(screen.getByLabelText(/required skills/i), "Java, PhD");
    await user.click(screen.getByRole("button", { name: /save posting/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdPosting));

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/api/job-postings");
    const body = JSON.parse(options.body);
    expect(body.requiredSkills).toEqual(["Java", "PhD"]);
    expect(body.title).toBe("Backend Engineer");
  });

  it("shows an error message when the save fails", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "title and description are required" }),
    });
    const user = userEvent.setup();

    render(<PastePostingForm />);

    await user.type(screen.getByLabelText(/^title$/i), "Backend Engineer");
    await user.type(screen.getByLabelText(/description/i), "Build APIs.");
    await user.click(screen.getByRole("button", { name: /save posting/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/required/i);
  });
});
