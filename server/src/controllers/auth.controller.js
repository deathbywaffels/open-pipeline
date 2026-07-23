import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const SALT_ROUNDS = 10;
const VALID_ROLES = ["CANDIDATE", "EMPLOYER"];

/**
 * POST /api/auth/register
 * Creates a new user account and logs them in (sets req.session.userId).
 * role is fixed at registration — there's no dual-role or role-switching
 * in v1, per SPEC.md. An EMPLOYER registration also creates their
 * Organization row in the same transaction, so every Employer account
 * has exactly one Organization from the moment they sign up.
 *
 * Inputs: body { email: string, password: string, name: string, role: "CANDIDATE" | "EMPLOYER" }
 * Response: 201 { id, email, name, role, needsSponsorship, commuteRadiusKm }
 *   | 400 (missing fields, or invalid role) | 409 (email taken)
 */
export async function register(req, res) {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res
      .status(400)
      .json({ error: "email, password, name, and role are required" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res
      .status(400)
      .json({ error: "role must be CANDIDATE or EMPLOYER" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, passwordHash, name, role },
    });
    if (role === "EMPLOYER") {
      await tx.organization.create({
        data: { userId: created.id, name: created.name },
      });
    }
    return created;
  });

  req.session.userId = user.id;
  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    needsSponsorship: user.needsSponsorship,
    commuteRadiusKm: user.commuteRadiusKm,
  });
}

/**
 * POST /api/auth/login
 * Verifies credentials and starts a session.
 *
 * Inputs: body { email: string, password: string }
 * Response: 200 { id, email, name, role, needsSponsorship, commuteRadiusKm } | 401 (invalid credentials)
 */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  const passwordMatches = user
    ? await bcrypt.compare(password || "", user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  req.session.userId = user.id;
  res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    needsSponsorship: user.needsSponsorship,
    commuteRadiusKm: user.commuteRadiusKm,
  });
}

/**
 * POST /api/auth/logout
 * Destroys the current session.
 *
 * Inputs: none.
 * Response: 204 | 500 (session store error)
 */
export function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out" });
    }
    res.status(204).end();
  });
}

/**
 * GET /api/auth/me
 * Returns the currently logged-in user. Requires requireAuth.
 *
 * Inputs: none.
 * Response: 200 { id, email, name, role, needsSponsorship, commuteRadiusKm } | 401 (not authenticated)
 */
export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
  });

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    needsSponsorship: user.needsSponsorship,
    commuteRadiusKm: user.commuteRadiusKm,
  });
}
