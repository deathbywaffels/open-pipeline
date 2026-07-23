import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SponsorImportForm } from "./SponsorImportForm.jsx";

describe("SponsorImportForm", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("imports pasted text and shows a created/skipped summary", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ created: 2, skippedExisting: 1 }),
    });
    const onImported = vi.fn();
    const user = userEvent.setup();

    render(<SponsorImportForm onImported={onImported} />);

    await user.type(
      screen.getByLabelText(/paste company names/i),
      "Acme B.V.\nGlobex NV",
    );
    await user.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(
      screen.getByText(/added 2 new companies, skipped 1 already/i),
    ).toBeInTheDocument();

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/api/sponsor-companies/import");
    expect(JSON.parse(options.body)).toEqual({
      text: "Acme B.V.\nGlobex NV",
    });

    // clears the textarea after a successful import
    expect(screen.getByLabelText(/paste company names/i)).toHaveValue("");
  });

  it("shows an error message when the import fails", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "No company names found in text" }),
    });
    const user = userEvent.setup();

    render(<SponsorImportForm />);

    await user.type(screen.getByLabelText(/paste company names/i), "Acme");
    await user.click(screen.getByRole("button", { name: /import/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no company names found/i,
    );
  });

  it("disables the import button until there is non-whitespace text", async () => {
    render(<SponsorImportForm />);
    expect(screen.getByRole("button", { name: /import/i })).toBeDisabled();
  });
});
