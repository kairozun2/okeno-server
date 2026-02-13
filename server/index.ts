import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { addDatabaseIndexes } from "./add-indexes";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, x-user-id");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: '50mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: '50mb' }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

interface LandingPageData {
  title: string;
  description: string;
  image: string;
  url: string;
  contentType: 'home' | 'user' | 'post' | 'miniapp';
  contentHtml: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildVerifiedBadgeSvg(): string {
  return `<span class="verified-badge"><svg viewBox="0 0 22 22" fill="none"><path d="M20.396 11c0-.795-.208-1.534-.564-2.182l.007-.007a3.39 3.39 0 00-.735-3.916 3.389 3.389 0 00-3.916-.735l-.006.007A5.553 5.553 0 0011 3.604a5.553 5.553 0 00-4.182 1.563l-.007-.007a3.389 3.389 0 00-3.916.735 3.39 3.39 0 00-.735 3.916l.007.006A5.554 5.554 0 003.604 11c0 .795.208 1.534.564 2.182l-.007.007a3.39 3.39 0 00.735 3.916 3.389 3.389 0 003.916.735l.006-.007A5.554 5.554 0 0011 18.396a5.554 5.554 0 004.182-1.563l.007.007a3.389 3.389 0 003.916-.735 3.39 3.39 0 00.735-3.916l-.007-.006A5.554 5.554 0 0020.396 11z" fill="#1d9bf0"/><path d="M8.287 12.95l-1.06-1.06a.75.75 0 111.06-1.061l1.59 1.59 3.888-3.889a.75.75 0 111.061 1.061l-4.418 4.42a.75.75 0 01-1.06 0l-.06-.06z" fill="#fff"/></svg></span>`;
}

function buildStoreLinksHtml(): string {
  return `<div class="divider">Get the app</div>
<div class="store-links">
  <a href="https://apps.apple.com/app/id982107779" class="store-btn" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
    App Store
  </a>
  <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" class="store-btn" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
    Google Play
  </a>
</div>`;
}

function buildOpenButtonHtml(label: string): string {
  return `<a href="#" class="open-btn" id="open-in-app">${escapeHtml(label)}</a>`;
}

async function getLandingPageData(reqPath: string, baseUrl: string): Promise<LandingPageData> {
  const defaultData: LandingPageData = {
    title: "Okeno",
    description: "A social media app to share moments with friends",
    image: `${baseUrl}/assets/images/icon.png`,
    url: baseUrl,
    contentType: 'home',
    contentHtml: `<div class="content-section">
  <div class="home-title">Okeno</div>
  <div class="home-desc">Share moments with the people who matter most.</div>
</div>
${buildStoreLinksHtml()}`,
  };

  try {
    if (reqPath.startsWith("/u/")) {
      const username = reqPath.split("/u/")[1]?.split("/")[0];
      if (username) {
        const { db } = await import("./db");
        const { users } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");

        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });

        if (user) {
          const safeUsername = escapeHtml(user.username);
          const safeEmoji = escapeHtml(user.emoji);
          const verifiedHtml = user.isVerified ? buildVerifiedBadgeSvg() : "";

          return {
            title: `${user.emoji} ${user.username} on Okeno`,
            description: `Check out ${user.username}'s profile on Okeno`,
            image: `${baseUrl}/assets/images/icon.png`,
            url: `${baseUrl}/u/${username}`,
            contentType: 'user',
            contentHtml: `<div class="content-section">
  <div class="user-emoji">${safeEmoji}</div>
  <div class="username">${safeUsername}${verifiedHtml}</div>
  <div class="subtitle">on Okeno</div>
</div>
${buildOpenButtonHtml("Open in Okeno")}
${buildStoreLinksHtml()}`,
          };
        }
      }
    }

    if (reqPath.startsWith("/post/")) {
      const postId = reqPath.split("/post/")[1]?.split("/")[0];
      if (postId) {
        const { db } = await import("./db");
        const { posts, users } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");

        const post = await db.query.posts.findFirst({
          where: eq(posts.id, postId),
        });

        if (post) {
          const postUser = await db.query.users.findFirst({
            where: eq(users.id, post.userId),
          });

          let ogImage = `${baseUrl}/assets/images/icon.png`;
          let imageHtml = "";
          if (post.imageUrl && !post.imageUrl.startsWith("file://") && !post.imageUrl.startsWith("blob:")) {
            let resolvedUrl = "";
            if (post.imageUrl.startsWith("/")) {
              resolvedUrl = `${baseUrl}${post.imageUrl}`;
            } else if (post.imageUrl.startsWith("http")) {
              resolvedUrl = post.imageUrl;
            }
            if (resolvedUrl) {
              ogImage = resolvedUrl;
              imageHtml = `<img src="${escapeHtml(resolvedUrl)}" alt="Post" class="post-image" />`;
            }
          }

          const safeUsername = escapeHtml(postUser?.username || "someone");
          const safeEmoji = escapeHtml(postUser?.emoji || "");
          const locationText = post.location ? ` · ${escapeHtml(post.location)}` : "";
          const feelingText = post.feeling ? ` · ${escapeHtml(post.feeling)}` : "";

          return {
            title: `${postUser?.emoji || ""} Post by ${postUser?.username || "someone"}${post.feeling ? " " + post.feeling : ""}`,
            description: `View this post${post.location ? " at " + post.location : ""} on Okeno`,
            image: ogImage,
            url: `${baseUrl}/post/${postId}`,
            contentType: 'post',
            contentHtml: `<div class="content-section">
  ${imageHtml}
  <div class="post-meta"><span class="post-meta-emoji">${safeEmoji}</span> ${safeUsername}</div>
  ${locationText || feelingText ? `<div class="post-info">${(locationText + feelingText).replace(/^ · /, "")}</div>` : ""}
</div>
${buildOpenButtonHtml("Open in Okeno")}
${buildStoreLinksHtml()}`,
          };
        }
      }
    }

    if (reqPath.startsWith("/mini-app/")) {
      const appId = reqPath.split("/mini-app/")[1]?.split("/")[0];
      if (appId) {
        const { db } = await import("./db");
        const { miniApps } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");

        const miniApp = await db.query.miniApps.findFirst({
          where: eq(miniApps.id, appId),
        });

        if (miniApp) {
          const safeName = escapeHtml(miniApp.name);
          const safeEmoji = escapeHtml(miniApp.emoji);
          const safeDesc = miniApp.description ? escapeHtml(miniApp.description) : "";

          return {
            title: `${miniApp.name} — Okeno Mini App`,
            description: miniApp.description || `Open ${miniApp.name} in Okeno`,
            image: `${baseUrl}/assets/images/icon.png`,
            url: `${baseUrl}/mini-app/${appId}`,
            contentType: 'miniapp',
            contentHtml: `<div class="content-section">
  <div class="miniapp-emoji">${safeEmoji}</div>
  <div class="miniapp-name">${safeName}</div>
  ${safeDesc ? `<div class="miniapp-desc">${safeDesc}</div>` : ""}
</div>
${buildOpenButtonHtml("Open in Okeno")}
${buildStoreLinksHtml()}`,
          };
        }
      }
    }
  } catch (error) {
    log(`[OG] Error fetching data for path ${reqPath}:`, error);
  }

  return defaultData;
}

async function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;

  const pageData = await getLandingPageData(req.path, baseUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName)
    .replace(/OG_TITLE_PLACEHOLDER/g, pageData.title)
    .replace(/OG_DESCRIPTION_PLACEHOLDER/g, pageData.description)
    .replace(/OG_IMAGE_PLACEHOLDER/g, pageData.image)
    .replace(/OG_URL_PLACEHOLDER/g, pageData.url)
    .replace(/CONTENT_HTML_PLACEHOLDER/g, pageData.contentHtml);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.get("/.well-known/apple-app-site-association", (_req, res) => {
    const aasa = {
      applinks: {
        apps: [],
        details: [
          {
            appID: "SY2H67GC49.com.moments.app",
            paths: ["/u/*", "/post/*", "/mini-app/*"],
          },
        ],
      },
    };
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(aasa);
  });

  app.use((req, res, next) => {
    const path = req.path;
    if (path.startsWith("/api")) {
      return next();
    }

    const isLandingPath = path === "/" || path === "/manifest" || path.startsWith("/u/") || path.startsWith("/post/") || path.startsWith("/mini-app/");
    
    if (isLandingPath) {
      log(`[Landing] Attempting to serve landing for path: ${path}`);
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }

      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      }).catch((error) => {
        log(`[Landing] Error serving landing page:`, error);
        res.status(500).send("Error loading page");
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets"), { maxAge: '1d' }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads"), { 
    maxAge: '1d',
    setHeaders: (res, path) => {
      if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  // Log 404s for uploads to debug image issues
  app.use("/uploads", (req, res) => {
    log(`[Image-Error] 404 Not Found: ${req.path}`);
    res.status(404).json({ error: "Image not found" });
  });
  app.use(express.static(path.resolve(process.cwd(), "static-build"), { maxAge: '1d' }));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupRateLimiting(app: express.Application) {
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const isAuthEndpoint = req.path.startsWith("/api/auth/");
    const limit = isAuthEndpoint ? 10 : 600;
    const key = `${ip}:${isAuthEndpoint ? "auth" : "general"}`;
    const now = Date.now();

    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + 60000 });
      return next();
    }

    entry.count++;
    if (entry.count > limit) {
      return res.status(429).json({ error: "Too many requests, please try again later" });
    }

    return next();
  });
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  setupRateLimiting(app);
  setupCors(app);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  setupBodyParsing(app);
  setupRequestLogging(app);

  const server = await registerRoutes(app);
  await addDatabaseIndexes();

  configureExpoAndLanding(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
