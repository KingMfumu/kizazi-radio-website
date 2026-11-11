
const json = (data, status = 200, extraHeaders = {}) => {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(data), { status, headers });
};

const COOKIE_NAME = "kizazi_admin_session";
const SESSION_DURATION = 8 * 60 * 60;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const COOKIE_OPTIONS = "Path=/; HttpOnly; Secure; SameSite=Strict";

function base64urlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function safeEqual(a, b) {
  const first = String(a);
  const second = String(b);
  let difference = first.length ^ second.length;
  const length = Math.max(first.length, second.length);

  for (let i = 0; i < length; i++) {
    difference |= (first.charCodeAt(i) || 0) ^ (second.charCodeAt(i) || 0);
  }

  return difference === 0;
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function createSession(username, secret) {
  const payload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  };

  const encoded = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded));

  return encoded + "." + base64urlEncode(new Uint8Array(signature));
}

async function verifySession(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadPart, signaturePart] = parts;
    const key = await getSigningKey(secret);

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(signaturePart),
      encoder.encode(payloadPart)
    );

    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(payloadPart))
    );

    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const cookies = (request.headers.get("Cookie") || "").split(";");

  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;

    if (cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }

  return null;
}

async function authenticateAdmin(request, env) {
  if (!env.SESSION_SECRET) return null;
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;
  return verifySession(token, env.SESSION_SECRET);
}

function validOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function makeSlug(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

async function uniqueSlug(db, title, currentId = null) {
  const base = makeSlug(title);
  if (!base) return null;

  let slug = base;
  let counter = 2;

  while (true) {
    const existing = await db.prepare(
      "SELECT id FROM articles WHERE slug = ? LIMIT 1"
    ).bind(slug).first();

    if (!existing || Number(existing.id) === Number(currentId)) return slug;

    slug = `${base}-${counter}`;
    counter++;
  }
}

function cleanArticleInput(data) {
  return {
    title: String(data.title || "").trim().slice(0, 250),
    excerpt: String(data.excerpt || "").trim().slice(0, 1000),
    content: String(data.content || "").trim(),
    image_url: String(data.image_url || "").trim().slice(0, 2000),
    category: String(data.category || "").trim().slice(0, 100),
    author: String(data.author || "KIZAZI RADIO").trim().slice(0, 150),
    status: data.status === "published" ? "published" : "draft",
  };
}

function cleanChartInput(data) {
  return {
    position: Number(data.position),
    song_title: String(data.song_title || "").trim().slice(0, 250),
    artist_name: String(data.artist_name || "").trim().slice(0, 250),
    artwork_url: String(data.artwork_url || "").trim().slice(0, 2000),
    youtube_url: String(data.youtube_url || "").trim().slice(0, 2000),
    status: data.status === "inactive" ? "inactive" : "active",
  };
}

function validYoutubeUrl(value) {
  try {
    const url = new URL(value);
    return (
      ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"].includes(url.hostname) &&
      (url.protocol === "https:" || url.protocol === "http:")
    );
  } catch {
    return false;
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isValidImage(file) {
  const allowed = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return allowed[file.type] || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // API HEALTH

    if (path === "/api/health" && method === "GET") {
      return json({
        success: true,
        message: "KIZAZI RADIO API is running",
        database: Boolean(env.NEWS_DB),
        adminAuth: Boolean(
          env.ADMIN_USERNAME && env.ADMIN_PASSWORD && env.SESSION_SECRET
        ),
        mediaStorage: Boolean(env.MEDIA_BUCKET),
      });
    }

    // ADMIN LOGIN

    if (path === "/api/admin/login" && method === "POST") {
      if (!validOrigin(request)) {
        return json({ success: false, error: "Invalid request origin" }, 403);
      }

      if (
        !env.ADMIN_USERNAME ||
        !env.ADMIN_PASSWORD ||
        !env.SESSION_SECRET ||
        env.SESSION_SECRET.length < 32
      ) {
        return json({ success: false, error: "Admin authentication is not configured" }, 503);
      }

      if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) {
        return json({ success: false, error: "JSON content type required" }, 415);
      }

      const credentials = await readJson(request);
      if (!credentials) return json({ success: false, error: "Invalid request" }, 400);

      const username = String(credentials.username || "");
      const password = String(credentials.password || "");

      if (
        !safeEqual(username, env.ADMIN_USERNAME) ||
        !safeEqual(password, env.ADMIN_PASSWORD)
      ) {
        return json({ success: false, error: "Invalid username or password" }, 401);
      }

      const token = await createSession(env.ADMIN_USERNAME, env.SESSION_SECRET);

      return json({ success: true, message: "Admin login successful" }, 200, {
        "Set-Cookie": `${COOKIE_NAME}=${token}; ${COOKIE_OPTIONS}; Max-Age=${SESSION_DURATION}`,
      });
    }

    // ADMIN SESSION

    if (path === "/api/admin/session" && method === "GET") {
      const session = await authenticateAdmin(request, env);

      if (!session) {
        return json({ success: false, authenticated: false }, 401);
      }

      return json({
        success: true,
        authenticated: true,
        username: session.sub,
        expiresAt: session.exp,
      });
    }

    // ADMIN LOGOUT

    if (path === "/api/admin/logout" && method === "POST") {
      if (!validOrigin(request)) {
        return json({ success: false, error: "Invalid request origin" }, 403);
      }

      return json({ success: true, message: "Logged out successfully" }, 200, {
        "Set-Cookie": `${COOKIE_NAME}=; ${COOKIE_OPTIONS}; Max-Age=0`,
      });
    }

    // PROTECTED ADMIN API ROUTES

    const isAdminApi =
      path === "/api/admin/articles" ||
      path.startsWith("/api/admin/articles/") ||
      path === "/api/admin/upload" ||
      path === "/api/admin/music-chart" ||
      path.startsWith("/api/admin/music-chart/");

    if (isAdminApi) {
      if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
        return json({ success: false, error: "Method not allowed" }, 405, {
          Allow: "GET, POST, PUT, DELETE",
        });
      }

      const session = await authenticateAdmin(request, env);
      if (!session) {
        return json({ success: false, error: "Authentication required" }, 401);
      }

      if (method !== "GET" && !validOrigin(request)) {
        return json({ success: false, error: "Invalid request origin" }, 403);
      }

      if (!env.NEWS_DB) {
        return json({ success: false, error: "Database unavailable" }, 503);
      }

      // ADMIN NEWS: LIST

      if (path === "/api/admin/articles" && method === "GET") {
        try {
          const result = await env.NEWS_DB.prepare(
            `SELECT id, title, slug, excerpt, content, image_url,
                    category, author, status, published_at,
                    created_at, updated_at
             FROM articles ORDER BY created_at DESC`
          ).all();

          return json({
            success: true,
            total: result.results.length,
            articles: result.results,
          });
        } catch {
          return json({ success: false, error: "Unable to retrieve articles" }, 500);
        }
      }

      // ADMIN NEWS: CREATE

      if (path === "/api/admin/articles" && method === "POST") {
        const data = await readJson(request);
        if (!data) return json({ success: false, error: "Invalid JSON data" }, 400);

        const article = cleanArticleInput(data);
        if (!article.title || !article.content) {
          return json({ success: false, error: "Title and article content are required" }, 400);
        }

        try {
          const slug = await uniqueSlug(env.NEWS_DB, article.title);
          const publishedAt =
            article.status === "published" ? new Date().toISOString() : null;

          const result = await env.NEWS_DB.prepare(
            `INSERT INTO articles
             (title, slug, excerpt, content, image_url, category,
              author, status, published_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
          ).bind(
            article.title, slug, article.excerpt, article.content,
            article.image_url || null, article.category || null,
            article.author, article.status, publishedAt
          ).run();

          return json({
            success: true,
            message: "Article created successfully",
            id: result.meta.last_row_id,
            slug,
          }, 201);
        } catch {
          return json({ success: false, error: "Unable to create article" }, 500);
        }
      }

      // ADMIN NEWS: UPDATE / DELETE

      if (path.startsWith("/api/admin/articles/")) {
        const idText = path.slice("/api/admin/articles/".length);
        const id = Number(idText);

        if (!Number.isInteger(id) || id < 1 || idText.includes("/")) {
          return json({ success: false, error: "Invalid article ID" }, 400);
        }

        const existing = await env.NEWS_DB.prepare(
          "SELECT id, published_at FROM articles WHERE id = ? LIMIT 1"
        ).bind(id).first();

        if (!existing) return json({ success: false, error: "Article not found" }, 404);

        if (method === "DELETE") {
          try {
            await env.NEWS_DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
            return json({ success: true, message: "Article deleted successfully" });
          } catch {
            return json({ success: false, error: "Unable to delete article" }, 500);
          }
        }

        if (method === "PUT") {
          const data = await readJson(request);
          if (!data) return json({ success: false, error: "Invalid JSON data" }, 400);

          const article = cleanArticleInput(data);
          if (!article.title || !article.content) {
            return json({ success: false, error: "Title and article content are required" }, 400);
          }

          try {
            const slug = await uniqueSlug(env.NEWS_DB, article.title, id);
            let publishedAt = existing.published_at;

            if (article.status === "draft") publishedAt = null;
            else if (!publishedAt) publishedAt = new Date().toISOString();

            await env.NEWS_DB.prepare(
              `UPDATE articles
               SET title = ?, slug = ?, excerpt = ?, content = ?,
                   image_url = ?, category = ?, author = ?,
                   status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(
              article.title, slug, article.excerpt, article.content,
              article.image_url || null, article.category || null,
              article.author, article.status, publishedAt, id
            ).run();

            return json({ success: true, message: "Article updated successfully", slug });
          } catch {
            return json({ success: false, error: "Unable to update article" }, 500);
          }
        }
      }

      // MUSIC CHART: LIST ALL FOR ADMIN

      if (path === "/api/admin/music-chart" && method === "GET") {
        try {
          const result = await env.NEWS_DB.prepare(
            `SELECT id, position, song_title, artist_name, artwork_url,
                    youtube_url, status, created_at, updated_at
             FROM music_chart
             ORDER BY position ASC`
          ).all();

          return json({
            success: true,
            total: result.results.length,
            chart: result.results,
          });
        } catch {
          return json({ success: false, error: "Unable to retrieve music chart" }, 500);
        }
      }

      // MUSIC CHART: CREATE

      if (path === "/api/admin/music-chart" && method === "POST") {
        const data = await readJson(request);
        if (!data) return json({ success: false, error: "Invalid JSON data" }, 400);

        const song = cleanChartInput(data);

        if (
          !Number.isInteger(song.position) ||
          song.position < 1 ||
          song.position > 15 ||
          !song.song_title ||
          !song.artist_name ||
          !song.youtube_url ||
          !validYoutubeUrl(song.youtube_url)
        ) {
          return json({
            success: false,
            error: "Enter a valid position (1–15), song title, artist and YouTube URL",
          }, 400);
        }

        try {
          const result = await env.NEWS_DB.prepare(
            `INSERT INTO music_chart
             (position, song_title, artist_name, artwork_url, youtube_url, status, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
          ).bind(
            song.position,
            song.song_title,
            song.artist_name,
            song.artwork_url || null,
            song.youtube_url,
            song.status
          ).run();

          return json({
            success: true,
            message: "Music chart song added successfully",
            id: result.meta.last_row_id,
          }, 201);
        } catch {
          return json({
            success: false,
            error: "Could not add song. This chart position may already be occupied.",
          }, 409);
        }
      }

      // MUSIC CHART: UPDATE / DELETE

      if (path.startsWith("/api/admin/music-chart/")) {
        const idText = path.slice("/api/admin/music-chart/".length);
        const id = Number(idText);

        if (!Number.isInteger(id) || id < 1 || idText.includes("/")) {
          return json({ success: false, error: "Invalid chart song ID" }, 400);
        }

        const existing = await env.NEWS_DB.prepare(
          "SELECT id FROM music_chart WHERE id = ? LIMIT 1"
        ).bind(id).first();

        if (!existing) return json({ success: false, error: "Song not found" }, 404);

        if (method === "DELETE") {
          try {
            await env.NEWS_DB.prepare(
              "DELETE FROM music_chart WHERE id = ?"
            ).bind(id).run();

            return json({ success: true, message: "Chart song deleted successfully" });
          } catch {
            return json({ success: false, error: "Unable to delete chart song" }, 500);
          }
        }

        if (method === "PUT") {
          const data = await readJson(request);
          if (!data) return json({ success: false, error: "Invalid JSON data" }, 400);

          const song = cleanChartInput(data);

          if (
            !Number.isInteger(song.position) ||
            song.position < 1 ||
            song.position > 15 ||
            !song.song_title ||
            !song.artist_name ||
            !song.youtube_url ||
            !validYoutubeUrl(song.youtube_url)
          ) {
            return json({
              success: false,
              error: "Enter a valid position (1–15), song title, artist and YouTube URL",
            }, 400);
          }

          try {
            await env.NEWS_DB.prepare(
              `UPDATE music_chart
               SET position = ?, song_title = ?, artist_name = ?,
                   artwork_url = ?, youtube_url = ?, status = ?,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(
              song.position,
              song.song_title,
              song.artist_name,
              song.artwork_url || null,
              song.youtube_url,
              song.status,
              id
            ).run();

            return json({ success: true, message: "Chart song updated successfully" });
          } catch {
            return json({
              success: false,
              error: "Could not update song. This chart position may already be occupied.",
            }, 409);
          }
        }
      }

      // IMAGE UPLOAD TO R2

      if (path === "/api/admin/upload" && method === "POST") {
        if (!env.MEDIA_BUCKET) {
          return json({ success: false, error: "Media storage is not configured" }, 503);
        }

        if (!request.headers.get("Content-Type")?.toLowerCase().includes("multipart/form-data")) {
          return json({ success: false, error: "Multipart form data required" }, 415);
        }

        try {
          const formData = await request.formData();
          const file = formData.get("file");
          const folder = formData.get("folder") === "music-chart" ? "music-chart" : "news";

          if (!file || typeof file.arrayBuffer !== "function") {
            return json({ success: false, error: "Please select an image" }, 400);
          }

          if (file.size < 1 || file.size > MAX_IMAGE_SIZE) {
            return json({ success: false, error: "Image must be smaller than 8 MB" }, 400);
          }

          const extension = isValidImage(file);
          if (!extension) {
            return json({
              success: false,
              error: "Only JPG, PNG, WEBP and GIF images are allowed",
            }, 400);
          }

          const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

          await env.MEDIA_BUCKET.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type },
          });

          const publicBase = String(env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
          if (!publicBase) {
            return json({ success: false, error: "R2_PUBLIC_URL is not configured" }, 503);
          }

          return json({
            success: true,
            message: "Image uploaded successfully",
            key,
            url: `${publicBase}/${key}`,
          }, 201);
        } catch {
          return json({ success: false, error: "Image upload failed" }, 500);
        }
      }

      return json({ success: false, error: "Admin endpoint not found" }, 404);
    }

    // PUBLIC MUSIC CHART: ACTIVE SONGS ONLY

    if (path === "/api/music-chart" && method === "GET") {
      try {
        const result = await env.NEWS_DB.prepare(
          `SELECT id, position, song_title, artist_name, artwork_url, youtube_url
           FROM music_chart
           WHERE status = 'active'
           ORDER BY position ASC`
        ).all();

        return json({
          success: true,
          total: result.results.length,
          chart: result.results,
        });
      } catch {
        return json({ success: false, error: "Unable to retrieve music chart" }, 500);
      }
    }

    // PUBLIC NEWS: LIST

    if (path === "/api/articles" && method === "GET") {
      try {
        const limit = Math.min(
          Math.max(Number(url.searchParams.get("limit")) || 20, 1),
          100
        );

        const result = await env.NEWS_DB.prepare(
          `SELECT id, title, slug, excerpt, content, image_url,
                  category, author, published_at
           FROM articles
           WHERE status = 'published'
           ORDER BY published_at DESC
           LIMIT ?`
        ).bind(limit).all();

        return json({
          success: true,
          total: result.results.length,
          articles: result.results,
        });
      } catch {
        return json({ success: false, error: "Unable to retrieve articles" }, 500);
      }
    }

    // PUBLIC NEWS: SINGLE ARTICLE

    if (path.startsWith("/api/articles/") && method === "GET") {
      try {
        const slug = decodeURIComponent(path.slice("/api/articles/".length));

        const article = await env.NEWS_DB.prepare(
          `SELECT id, title, slug, excerpt, content, image_url,
                  category, author, published_at
           FROM articles
           WHERE slug = ? AND status = 'published'
           LIMIT 1`
        ).bind(slug).first();

        if (!article) return json({ success: false, error: "Article not found" }, 404);

        return json({ success: true, article });
      } catch {
        return json({ success: false, error: "Unable to retrieve article" }, 500);
      }
    }

    // SERVE WEBSITE FILES

    return env.ASSETS.fetch(request);
  },
};
