import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PasteJobForm } from "./PasteJobForm.jsx";

describe("PasteJobForm", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  it("submits the form and parses comma-separated required skills", async () => {
    const createdJob = { id: 1, title: "Backend Engineer" };
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createdJob,
    });
    const onCreated = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PasteJobForm onCreated={onCreated} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^title$/i), "Backend Engineer");
    await user.type(screen.getByLabelText(/company/i), "Acme Inc");
    await user.type(
      screen.getByLabelText(/job link/i),
      "https://example.com/jobs/1",
    );
    await user.type(screen.getByLabelText(/description/i), "Build APIs.");
    await user.type(screen.getByLabelText(/required skills/i), "Java, PhD");
    await user.click(screen.getByRole("button", { name: /save job/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdJob));

    const [, options] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.requiredSkills).toEqual(["Java", "PhD"]);
    expect(body.title).toBe("Backend Engineer");
  });

  it("shows an error message when the save fails", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "title, company, description, and sourceUrl are required",
      }),
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PasteJobForm />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^title$/i), "Backend Engineer");
    await user.type(screen.getByLabelText(/company/i), "Acme Inc");
    await user.type(
      screen.getByLabelText(/job link/i),
      "https://example.com/jobs/1",
    );
    await user.type(screen.getByLabelText(/description/i), "Build APIs.");
    await user.click(screen.getByRole("button", { name: /save job/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/required/i);
  });

  it("hides AI-assisted paste and links to Settings when no API key is set", () => {
    render(
      <MemoryRouter>
        <PasteJobForm />
      </MemoryRouter>,
    );

    expect(
      screen.queryByLabelText(/paste raw job text/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /add an anthropic api key/i }),
    ).toHaveAttribute("href", "/settings");
  });

  it("extracts fields from pasted text via AI when a key is configured", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: "Backend Engineer",
        company: "Acme Inc",
        locationText: "Remote",
        description: "Build APIs.",
        requiredSkills: ["Node.js", "SQL"],
      }),
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PasteJobForm />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText(/paste raw job text/i),
      "Backend Engineer at Acme Inc, remote...",
    );
    await user.click(screen.getByRole("button", { name: /extract with ai/i }));

    expect(await screen.findByLabelText(/^title$/i)).toHaveValue(
      "Backend Engineer",
    );
    expect(screen.getByLabelText(/company/i)).toHaveValue("Acme Inc");
    expect(screen.getByLabelText(/location/i)).toHaveValue("Remote");
    expect(screen.getByLabelText(/required skills/i)).toHaveValue(
      "Node.js, SQL",
    );

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/api/ai/extract-job");
    expect(options.headers["X-AI-Api-Key"]).toBe("sk-ant-test-123");
  });

  it("shows an AI error without touching the form fields", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid Anthropic API key" }),
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PasteJobForm />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText(/paste raw job text/i),
      "Some job text",
    );
    await user.click(screen.getByRole("button", { name: /extract with ai/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid anthropic api key/i,
    );
    expect(screen.getByLabelText(/^title$/i)).toHaveValue("");
  });
});
