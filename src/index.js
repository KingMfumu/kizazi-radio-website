
const json = (data, status = 200, extraHeaders = {}) => {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
};

const COOKIE_NAME = "kizazi_admin_session";
const SESSION_DURATION = 8 * 60 * 60;

const encoder = new TextEncoder();

function base64urlEncode(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    "="
  );

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  );
}

function safeEqual(a, b) {
  const first = String(a);
  const second = String(b);

  let difference = first.length ^ second.length;
  const length = Math.max(first.length, second.length);

  for (let i = 0; i < length; i++) {
    difference |=
      (first.charCodeAt(i) || 0) ^
      (second.charCodeAt(i) || 0);
  }

  return difference === 0;
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"]
  );
}

async function createSession(username, secret) {
  const payload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  };

  const encodedPayload = base64urlEncode(
    encoder.encode(JSON.stringify(payload))
  );

  const key = await getSigningKey(secret);

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload)
  );

  return (
    encodedPayload +
    "." +
    base64urlEncode(new Uint8Array(signature))
  );
}

async function verifySession(token, secret) {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, encodedSignature] = parts;

    const key = await getSigningKey(secret);

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(encodedSignature),
      encoder.encode(encodedPayload)
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(
        base64urlDecode(encodedPayload)
      )
    );

    if (
      !payload.sub ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");

    if (separator === -1) continue;

    const key = cookie.slice(0, separator).trim();

    if (key === name) {
      return cookie.slice(separator + 1).trim();
    }
  }

  return null;
}

async function authenticateAdmin(request, env) {
  if (!env.SESSION_SECRET) {
    return null;
  }

  const token = getCookie(request, COOKIE_NAME);

  if (!token) {
    return null;
  }

  return verifySession(token, env.SESSION_SECRET);
}

const SESSION_COOKIE_OPTIONS =
  "Path=/; HttpOnly; Secure; SameSite=Strict";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // =========================================
    // 1. API HEALTH CHECK
    // =========================================

    if (path === "/api/health") {
      return json({
        success: true,
        message: "KIZAZI RADIO API is running",
        database: Boolean(env.NEWS_DB),
        adminAuth: Boolean(
          env.ADMIN_USERNAME &&
          env.ADMIN_PASSWORD &&
          env.SESSION_SECRET
        ),
      });
    }

    // =========================================
    // 2. ADMIN LOGIN
    // =========================================

    if (
      path === "/api/admin/login" &&
      request.method === "POST"
    ) {
      if (
        !env.ADMIN_USERNAME ||
        !env.ADMIN_PASSWORD ||
        !env.SESSION_SECRET ||
        env.SESSION_SECRET.length < 32
      ) {
        return json({
          success: false,
          error: "Admin authentication is not configured",
        }, 503);
      }

      if (
        !request.headers
          .get("Content-Type")
          ?.toLowerCase()
          .includes("application/json")
      ) {
        return json({
          success: false,
          error: "JSON content type required",
        }, 415);
      }

      let credentials;

      try {
        credentials = await request.json();
      } catch {
        return json({
          success: false,
          error: "Invalid request",
        }, 400);
      }

      const username = String(
        credentials.username || ""
      );

      const password = String(
        credentials.password || ""
      );

      if (
        !safeEqual(username, env.ADMIN_USERNAME) ||
        !safeEqual(password, env.ADMIN_PASSWORD)
      ) {
        return json({
          success: false,
          error: "Invalid username or password",
        }, 401);
      }

      const token = await createSession(
        env.ADMIN_USERNAME,
        env.SESSION_SECRET
      );

      return json({
        success: true,
        message: "Admin login successful",
      }, 200, {
        "Set-Cookie":
          `${COOKIE_NAME}=${token}; ${SESSION_COOKIE_OPTIONS}; Max-Age=${SESSION_DURATION}`,
      });
    }

    // =========================================
    // 3. CHECK ADMIN SESSION
    // =========================================

    if (
      path === "/api/admin/session" &&
      request.method === "GET"
    ) {
      const session = await authenticateAdmin(
        request,
        env
      );

      if (!session) {
        return json({
          success: false,
          authenticated: false,
        }, 401);
      }

      return json({
        success: true,
        authenticated: true,
        username: session.sub,
        expiresAt: session.exp,
      });
    }

    // =========================================
    // 4. ADMIN LOGOUT
    // =========================================

    if (
      path === "/api/admin/logout" &&
      request.method === "POST"
    ) {
      return json({
        success: true,
        message: "Logged out successfully",
      }, 200, {
        "Set-Cookie":
          `${COOKIE_NAME}=; ${SESSION_COOKIE_OPTIONS}; Max-Age=0`,
      });
    }

    // =========================================
    // 5. GET PUBLISHED ARTICLES
    // =========================================

    if (
      path === "/api/articles" &&
      request.method === "GET"
    ) {
      try {
        const limit = Math.min(
          Math.max(
            Number(url.searchParams.get("limit")) || 20,
            1
          ),
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
        return json({
          success: false,
          error: "Unable to retrieve articles",
        }, 500);
      }
    }

    // =========================================
    // 6. GET SINGLE PUBLISHED ARTICLE
    // =========================================

    if (
      path.startsWith("/api/articles/") &&
      request.method === "GET"
    ) {
      try {
        const slug = decodeURIComponent(
          path.slice("/api/articles/".length)
        );

        const article = await env.NEWS_DB.prepare(
          `SELECT id, title, slug, excerpt, content, image_url,
                  category, author, published_at
           FROM articles
           WHERE slug = ? AND status = 'published'
           LIMIT 1`
        ).bind(slug).first();

        if (!article) {
          return json({
            success: false,
            error: "Article not found",
          }, 404);
        }

        return json({
          success: true,
          article,
        });
      } catch {
        return json({
          success: false,
          error: "Unable to retrieve article",
        }, 500);
      }
    }

    // =========================================
    // 7. SERVE WEBSITE FILES
    // =========================================

    return env.ASSETS.fetch(request);
  },
};
