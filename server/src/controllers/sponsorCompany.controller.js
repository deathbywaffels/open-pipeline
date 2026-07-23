import { prisma } from "../lib/prisma.js";
import { normalizeCompanyName } from "../services/sponsorMatch.service.js";

const VALID_STATUSES = ["NOT_STARTED", "RESEARCHING", "APPLIED", "REJECTED"];
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * POST /api/sponsor-companies/import
 * Bulk-imports sponsor company names from pasted text (split on newlines
 * and/or commas). Safe to re-run with an overlapping/updated list —
 * entries that already exist (matched by normalized name + country) are
 * skipped, never duplicated or overwritten.
 *
 * Inputs: body { text: string, country?: string }
 * Response: 201 { created: number, skippedExisting: number } | 400 (no names found)
 */
export async function importSponsorCompanies(req, res) {
  const { text, country } = req.body;

  const names = [
    ...new Set(
      (text || "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];

  if (names.length === 0) {
    return res.status(400).json({ error: "No company names found in text" });
  }

  const resolvedCountry = country && country.trim() ? country.trim() : "NL";

  const result = await prisma.sponsorCompany.createMany({
    data: names.map((name) => ({
      userId: req.session.userId,
      name,
      normalizedName: normalizeCompanyName(name),
      country: resolvedCountry,
    })),
    skipDuplicates: true,
  });

  res.status(201).json({
    created: result.count,
    skippedExisting: names.length - result.count,
  });
}

/**
 * GET /api/sponsor-companies
 * Lists the current user's sponsor companies, paginated — a real sponsor
 * list (e.g. the full IND register) can run into the tens of thousands of
 * rows, which would hang the browser if rendered all at once. Use
 * `search` to look up a specific company, or `status` to focus on ones
 * actively being worked.
 *
 * Inputs: query {
 *   country?: string, status?: SponsorOutreachStatus, search?: string,
 *   page?: number (1-based, default 1), limit?: number (default 30, max 100)
 * }
 * Response: 200 { companies: SponsorCompany[], total, page, limit }
 *   | 400 (invalid status filter)
 */
export async function listSponsorCompanies(req, res) {
  const { country, status, search } = req.query;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status filter" });
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT),
  );

  const where = {
    userId: req.session.userId,
    ...(country ? { country } : {}),
    ...(status ? { outreachStatus: status } : {}),
    ...(search && search.trim()
      ? { name: { contains: search.trim(), mode: "insensitive" } }
      : {}),
  };

  const [companies, total] = await Promise.all([
    prisma.sponsorCompany.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sponsorCompany.count({ where }),
  ]);

  res.status(200).json({ companies, total, page, limit });
}

/**
 * PATCH /api/sponsor-companies/:id
 * Updates outreach-tracking fields for a sponsor company. Only fields
 * present in the body are changed — hiresItWorkers may be explicitly set
 * to null to revert it back to "unknown". Changing outreachStatus also
 * timestamps lastOutreachAt, which feeds the daily "reached out" goal —
 * editing notes/careersUrl/hiresItWorkers alone does not count as outreach.
 *
 * Inputs: path { id: number }, body {
 *   outreachStatus?: SponsorOutreachStatus, hiresItWorkers?: boolean|null,
 *   notes?: string, careersUrl?: string
 * }
 * Response: 200 SponsorCompany | 400 (invalid status) | 404
 */
export async function updateSponsorCompany(req, res) {
  const id = Number(req.params.id);
  const { outreachStatus, hiresItWorkers, notes, careersUrl } = req.body;

  if (
    outreachStatus !== undefined &&
    !VALID_STATUSES.includes(outreachStatus)
  ) {
    return res.status(400).json({ error: "Invalid outreachStatus" });
  }

  const existing = await prisma.sponsorCompany.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.session.userId) {
    return res.status(404).json({ error: "Sponsor company not found" });
  }

  const data = {};
  if (outreachStatus !== undefined) {
    data.outreachStatus = outreachStatus;
    if (outreachStatus !== existing.outreachStatus) {
      data.lastOutreachAt = new Date();
    }
  }
  if (hiresItWorkers !== undefined) data.hiresItWorkers = hiresItWorkers;
  if (notes !== undefined) data.notes = notes;
  if (careersUrl !== undefined) data.careersUrl = careersUrl;

  const updated = await prisma.sponsorCompany.update({ where: { id }, data });
  res.status(200).json(updated);
}

/**
 * DELETE /api/sponsor-companies/:id
 * Removes a sponsor company entry (e.g. a bad import or duplicate).
 *
 * Inputs: path { id: number }
 * Response: 204 | 404
 */
export async function deleteSponsorCompany(req, res) {
  const id = Number(req.params.id);

  const existing = await prisma.sponsorCompany.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.session.userId) {
    return res.status(404).json({ error: "Sponsor company not found" });
  }

  await prisma.sponsorCompany.delete({ where: { id } });
  res.status(204).end();
}
