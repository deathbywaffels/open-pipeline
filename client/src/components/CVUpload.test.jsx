import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CVUpload } from "./CVUpload.jsx";

function renderCVUpload(props) {
  return render(
    <MemoryRouter>
      <CVUpload {...props} />
    </MemoryRouter>,
  );
}

describe("CVUpload", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  it("shows an empty state when there are no CVs", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    renderCVUpload();
    expect(await screen.findByText(/no cvs uploaded yet/i)).toBeInTheDocument();
  });

  it("lists uploaded CVs with a download link", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          filename: "resume.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          uploadedAt: new Date().toISOString(),
        },
      ],
    });
    renderCVUpload();

    expect(await screen.findByText("resume.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      "/api/cv/1/download",
    );
  });

  it("uploads a selected file", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          filename: "resume.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
          uploadedAt: new Date().toISOString(),
        }),
      }); // upload response
    const user = userEvent.setup();

    renderCVUpload();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    const file = new File(["pdf content"], "resume.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, file);

    expect(await screen.findByText("resume.pdf")).toBeInTheDocument();
    const [url, options] = globalThis.fetch.mock.calls[1];
    expect(url).toBe("/api/cv");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("shows an error when upload fails", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "Only PDF, DOC, and DOCX files are allowed",
        }),
      });
    const user = userEvent.setup();

    renderCVUpload();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    // Extension matches the input's accept filter (so userEvent actually fires
    // the change event) but the real mimetype is spoofed, exactly the case
    // the server's fileFilter guards against since client Content-Type can't
    // be trusted.
    const file = new File(["exe content"], "resume.pdf", {
      type: "application/x-msdownload",
    });
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /pdf, doc, and docx/i,
    );
  });

  it("hides the extract-skills action and shows a Settings hint when no API key is set", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          filename: "resume.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          uploadedAt: new Date().toISOString(),
        },
      ],
    });
    renderCVUpload();

    await screen.findByText("resume.pdf");
    expect(
      screen.queryByRole("button", { name: /extract skills/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /add an anthropic api key/i }),
    ).toHaveAttribute("href", "/settings");
  });

  it("extracts skills from a CV, posts them, and reports the added count", async () => {
    localStorage.setItem("ai.apiKey", "sk-ant-test-123");
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            filename: "resume.pdf",
            mimeType: "application/pdf",
            sizeBytes: 2048,
            uploadedAt: new Date().toISOString(),
          },
        ],
      }) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: ["React", "SQL"] }),
      }) // extract-cv-skills
      .mockResolvedValueOnce({
        status: 201,
        json: async () => ({ id: 10, name: "React" }),
      })
      .mockResolvedValueOnce({
        status: 409,
        json: async () => ({ error: "Skill already added" }),
      });
    const onSkillsAdded = vi.fn();
    const user = userEvent.setup();

    renderCVUpload({ onSkillsAdded });
    await screen.findByText("resume.pdf");

    await user.click(screen.getByRole("button", { name: /extract skills/i }));

    expect(await screen.findByText(/added 1 new skill/i)).toBeInTheDocument();
    expect(onSkillsAdded).toHaveBeenCalled();

    const [extractUrl, extractOptions] = globalThis.fetch.mock.calls[1];
    expect(extractUrl).toBe("/api/ai/extract-cv-skills/1");
    expect(extractOptions.headers["X-AI-Api-Key"]).toBe("sk-ant-test-123");
  });
});
