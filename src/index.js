
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API health check
    if (path === "/api/health") {
      return json({
        success: true,
        message: "KIZAZI RADIO API is running",
        database: Boolean(env.NEWS_DB),
      });
    }

    // Get published articles
    if (path === "/api/articles" && request.method === "GET") {
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
      } catch (error) {
        return json({
          success: false,
          error: "Unable to retrieve articles",
        }, 500);
      }
    }

    // Get one published article by slug
    if (path.startsWith("/api/articles/") && request.method === "GET") {
      try {
        const slug = decodeURIComponent(path.slice("/api/articles/".length));

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
      } catch (error) {
        return json({
          success: false,
          error: "Unable to retrieve article",
        }, 500);
      }
    }

    // All other requests go to the website files
    return env.ASSETS.fetch(request);
  },
};
