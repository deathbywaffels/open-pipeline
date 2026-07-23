import "dotenv/config"; // must run before any transitive import of lib/prisma.js
import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import skillRoutes from "./routes/skill.routes.js";
import jobListingRoutes from "./routes/jobListing.routes.js";
import dislikeReasonRoutes from "./routes/dislikeReason.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import questRoutes from "./routes/quest.routes.js";
import streakRoutes from "./routes/streak.routes.js";
import userRoutes from "./routes/user.routes.js";
import cvRoutes from "./routes/cv.routes.js";
import rejectionLetterRoutes from "./routes/rejectionLetter.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import sponsorCompanyRoutes from "./routes/sponsorCompany.routes.js";
import desiredLocationRoutes from "./routes/desiredLocation.routes.js";
import coachingRoutes from "./routes/coaching.routes.js";
import companyFitRoutes from "./routes/companyFit.routes.js";
import jobPostingRoutes from "./routes/jobPosting.routes.js";
import candidateLeadRoutes from "./routes/candidateLead.routes.js";
import discoveryRoutes from "./routes/discovery.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const CLIENT_DIST = path.resolve(process.cwd(), "../client/dist");
const DEV_SESSION_SECRET = "dev-secret-change-me";

function createSessionStore() {
  if (process.env.NODE_ENV === "test") {
    return undefined; // falls back to express-session's in-memory MemoryStore
  }
  // Postgres-backed (not local disk) so sessions survive redeploys/restarts
  // on a host with an ephemeral filesystem. Auto-creates its "session"
  // table on first use.
  const PgSession = connectPgSimple(session);
  return new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
  });
}

function assertSessionSecretIsConfigured() {
  if (process.env.NODE_ENV !== "production") return;
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET === DEV_SESSION_SECRET
  ) {
    throw new Error(
      "SESSION_SECRET must be set to a real secret in production (refusing to boot with the dev default).",
    );
  }
}

export function createApp() {
  assertSessionSecretIsConfigured();

  const app = express();

  // Render (and most PaaS hosts) terminate TLS at a proxy in front of the
  // app — without this, express-session can't tell the request was HTTPS
  // and secure cookies would never be set.
  app.set("trust proxy", 1);

  app.use(cors());
  app.use(express.json());
  app.use(
    session({
      store: createSessionStore(),
      secret: process.env.SESSION_SECRET || DEV_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    }),
  );

  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/skills", skillRoutes);
  app.use("/api/job-listings", jobListingRoutes);
  app.use("/api/dislike-reasons", dislikeReasonRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/quest", questRoutes);
  app.use("/api/streak", streakRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/cv", cvRoutes);
  app.use("/api/rejection-letters", rejectionLetterRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/sponsor-companies", sponsorCompanyRoutes);
  app.use("/api/desired-locations", desiredLocationRoutes);
  app.use("/api/coaching", coachingRoutes);
  app.use("/api/company-fit", companyFitRoutes);
  app.use("/api/job-postings", jobPostingRoutes);
  app.use("/api/candidate-leads", candidateLeadRoutes);
  app.use("/api/discovery", discoveryRoutes);
  app.use("/api", notFoundHandler);

  // Serves the built client (npm run build) so one process/origin handles
  // both the API and the frontend in production — sidesteps CORS and
  // cross-site cookie issues entirely. Absent in local dev, where Vite's
  // own dev server serves the client instead.
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    // Express 5 (path-to-regexp v8) requires a named wildcard, not bare "*".
    app.get("/*splat", (req, res) => {
      res.sendFile(path.join(CLIENT_DIST, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
