import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SponsorCompanyCard } from "./SponsorCompanyCard.jsx";

const baseCompany = {
  id: 1,
  name: "Acme B.V.",
  country: "NL",
  outreachStatus: "NOT_STARTED",
  hiresItWorkers: null,
  notes: "",
  careersUrl: "",
};

function renderCard(company, { onUpdate = vi.fn(), onDelete = vi.fn() } = {}) {
  render(
    <MemoryRouter>
      <ul>
        <SponsorCompanyCard
          company={company}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </ul>
    </MemoryRouter>,
  );
  return { onUpdate, onDelete };
}

describe("SponsorCompanyCard", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("renders the company name and country", () => {
    renderCard(baseCompany);
    expect(screen.getByText("Acme B.V.")).toBeInTheDocument();
    expect(screen.getByText("NL")).toBeInTheDocument();
  });

  it("PATCHes and calls onUpdate when the outreach status changes", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...baseCompany, outreachStatus: "APPLIED" }),
    });
    const { onUpdate } = renderCard(baseCompany);
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByLabelText(/outreach status/i),
      "APPLIED",
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/sponsor-companies/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ outreachStatus: "APPLIED" }),
      }),
    );
    expect(onUpdate).toHaveBeenCalledWith({
      ...baseCompany,
      outreachStatus: "APPLIED",
    });
  });

  it("sets hiresItWorkers to true/false/null via the tri-state buttons", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...baseCompany, hiresItWorkers: true }),
    });
    renderCard(baseCompany);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      hiresItWorkers: true,
    });

    await user.click(screen.getByRole("button", { name: "No" }));
    expect(JSON.parse(globalThis.fetch.mock.calls[1][1].body)).toEqual({
      hiresItWorkers: false,
    });

    await user.click(screen.getByRole("button", { name: "Unknown" }));
    expect(JSON.parse(globalThis.fetch.mock.calls[2][1].body)).toEqual({
      hiresItWorkers: null,
    });
  });

  it("PATCHes notes only on blur, and only when changed", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...baseCompany, notes: "Great culture" }),
    });
    renderCard(baseCompany);
    const user = userEvent.setup();

    const notesField = screen.getByLabelText(/notes/i);
    await user.type(notesField, "Great culture");
    await user.tab();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/sponsor-companies/1",
      expect.objectContaining({
        body: JSON.stringify({ notes: "Great culture" }),
      }),
    );
  });

  it("does not PATCH notes on blur when unchanged", async () => {
    renderCard(baseCompany);
    const notesField = screen.getByLabelText(/notes/i);
    notesField.focus();
    const user = userEvent.setup();
    await user.tab();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("deletes the company and calls onDelete", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true });
    const { onDelete } = renderCard(baseCompany);
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /remove acme b\.v\./i }),
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/sponsor-companies/1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("links to the Coach page with a fit-check context built from the company's details", () => {
    renderCard({
      ...baseCompany,
      careersUrl: "https://acme.example.com/careers",
      notes: "Great culture",
    });

    const link = screen.getByRole("link", { name: /check ai fit/i });
    expect(link).toHaveAttribute("href", "/coach");
  });
});
