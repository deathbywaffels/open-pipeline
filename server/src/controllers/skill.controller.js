import { prisma } from "../lib/prisma.js";

/**
 * GET /api/skills
 * Lists the current user's skills.
 *
 * Inputs: none.
 * Response: 200 [{ id, name, createdAt }]
 */
export async function listSkills(req, res) {
  const skills = await prisma.skill.findMany({
    where: { userId: req.session.userId },
    orderBy: { name: "asc" },
  });
  res.status(200).json(skills);
}

/**
 * POST /api/skills
 * Adds a skill to the current user's profile.
 *
 * Inputs: body { name: string }
 * Response: 201 { id, name, createdAt } | 400 (missing name) | 409 (duplicate)
 */
export async function createSkill(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const existing = await prisma.skill.findUnique({
    where: { userId_name: { userId: req.session.userId, name: name.trim() } },
  });
  if (existing) {
    return res.status(409).json({ error: "Skill already added" });
  }

  const skill = await prisma.skill.create({
    data: { userId: req.session.userId, name: name.trim() },
  });
  res.status(201).json(skill);
}

/**
 * DELETE /api/skills/:id
 * Removes a skill from the current user's profile.
 *
 * Inputs: path { id: number }
 * Response: 204 | 404 (not found or not owned by the current user)
 */
export async function deleteSkill(req, res) {
  const id = Number(req.params.id);

  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill || skill.userId !== req.session.userId) {
    return res.status(404).json({ error: "Skill not found" });
  }

  await prisma.skill.delete({ where: { id } });
  res.status(204).end();
}
