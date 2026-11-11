
document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // KIZAZI RADIO - MAIN WEBSITE JAVASCRIPT
  // ==========================================

  // 1. COPYRIGHT YEAR
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // 2. MOBILE NAVIGATION
  const menu = document.querySelector(".menu");
  const nav = document.querySelector(".nav");

  if (menu && nav) {
    menu.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(isOpen));
      menu.textContent = isOpen ? "×" : "☰";
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
        menu.textContent = "☰";
      });
    });
  }

  // 3. OFFICIAL LOGO
  document.querySelectorAll("[data-official-logo]").forEach(logo => {
    logo.src = "/assets/kizazi-radio-official-logo.png";
  });

  // 4. HELPER FUNCTIONS
  const escapeHTML = value => {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  };

  const safeImageURL = value => {
    if (!value) return "";

    try {
      const url = new URL(value, window.location.origin);

      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.href;
      }

      return "";
    } catch {
      return "";
    }
  };

  const formatDate = value => {
    if (!value) return "LATEST NEWS";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "LATEST NEWS";
    }

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // 5. FIND AND REUSE THE EXISTING HOMEPAGE NEWS SECTION
  // This prevents the old "New updates coming soon" section
  // from remaining on the homepage.

  const existingNewsSection =
    document.querySelector("main #news") ||
    Array.from(document.querySelectorAll("main section, main .section"))
      .find(section => {
        const text = section.textContent || "";

        return (
          /THE LATEST FROM KIZAZI RADIO/i.test(text) ||
          /New updates coming soon/i.test(text)
        );
      });

  const newsSection = existingNewsSection || document.createElement("section");

  newsSection.classList.add("section", "kizazi-news");
  newsSection.id = "news";

  newsSection.innerHTML = `
    <div class="wrap">

      <div class="section-head">
        <span class="num">03</span>

        <div>
          <p class="eyebrow">The latest stories</p>
          <h2 class="section-title">
            NEWS & <em>UPDATES.</em>
          </h2>
        </div>
      </div>

      <div class="news-grid" id="newsGrid">
        <p class="news-loading">Loading latest stories...</p>
      </div>

      <div class="news-footer">
        <a href="/news/" class="secondary">VIEW ALL NEWS ↗</a>
      </div>

    </div>
  `;

  if (!existingNewsSection) {
    const aboutSection = document.querySelector("#about");

    if (aboutSection) {
      aboutSection.before(newsSection);
    } else {
      document.querySelector("main")?.appendChild(newsSection);
    }
  }

  // 6. ARTICLE MODAL
  const articleModal = document.createElement("div");

  articleModal.className = "news-modal";
  articleModal.id = "newsModal";

  articleModal.innerHTML = `
    <div class="news-modal-backdrop"></div>

    <div class="news-modal-panel"
         role="dialog"
         aria-modal="true"
         aria-labelledby="modalArticleTitle">

      <button class="news-modal-close"
              type="button"
              aria-label="Close article">×</button>

      <div id="modalArticleContent"></div>

    </div>
  `;

  document.body.appendChild(articleModal);

  const modalContent = articleModal.querySelector(
    "#modalArticleContent"
  );

  const closeModal = () => {
    articleModal.classList.remove("open");
    document.body.style.overflow = "";
  };

  articleModal.querySelector(".news-modal-close")
    .addEventListener("click", closeModal);

  articleModal.querySelector(".news-modal-backdrop")
    .addEventListener("click", closeModal);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  const openArticle = article => {
    const image = safeImageURL(article.image_url);

    modalContent.innerHTML = `
      ${
        image
          ? `<img class="modal-article-image"
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(article.title)}">`
          : ""
      }

      <div class="modal-article-body">

        <div class="news-meta">
          <span>${escapeHTML(article.category || "NEWS")}</span>
          <small>${escapeHTML(formatDate(article.published_at))}</small>
        </div>

        <h2 id="modalArticleTitle">
          ${escapeHTML(article.title)}
        </h2>

        <p class="modal-article-author">
          By ${escapeHTML(article.author || "KIZAZI RADIO")}
        </p>

        ${
          article.excerpt
            ? `<p class="modal-article-excerpt">
                 ${escapeHTML(article.excerpt)}
               </p>`
            : ""
        }

        <div class="modal-article-text">${escapeHTML(
          article.content || ""
        )}</div>

        <div class="modal-article-footer">
          <span>KIZAZI RADIO</span>
          <span>THE SOUND OF WHAT'S NEXT.</span>
        </div>

      </div>
    `;

    articleModal.classList.add("open");
    document.body.style.overflow = "hidden";

    articleModal.querySelector(".news-modal-close").focus();
  };

  // 7. DISPLAY ARTICLES
  const newsGrid = document.getElementById("newsGrid");

  const displayArticles = articles => {
    if (!newsGrid) return;

    if (!Array.isArray(articles) || articles.length === 0) {
      newsGrid.innerHTML = `
        <p class="news-message">
          No published stories available at the moment.
          Please check back soon.
        </p>
      `;
      return;
    }

    newsGrid.innerHTML = articles.map((article, index) => {
      const image = safeImageURL(article.image_url);

      return `
        <article class="news-card">

          <button class="news-image news-open-article"
                  type="button"
                  data-article-index="${index}"
                  aria-label="Read ${escapeHTML(article.title)}">

            ${
              image
                ? `<img src="${escapeHTML(image)}"
                        alt="${escapeHTML(article.title)}"
                        loading="lazy">`
                : `<div class="news-placeholder">
                     <span>KIZAZI</span>
                     <strong>NEWS</strong>
                   </div>`
            }

          </button>

          <div class="news-content">

            <div class="news-meta">
              <span>${escapeHTML(article.category || "NEWS")}</span>
              <small>${escapeHTML(formatDate(article.published_at))}</small>
            </div>

            <h3>
              <button class="news-title-button news-open-article"
                      type="button"
                      data-article-index="${index}">
                ${escapeHTML(article.title)}
              </button>
            </h3>

            <p>${escapeHTML(article.excerpt || "")}</p>

            <button class="news-read news-open-article"
                    type="button"
                    data-article-index="${index}">
              READ STORY <span>↗</span>
            </button>

          </div>

        </article>
      `;
    }).join("");

    newsGrid.querySelectorAll(".news-open-article").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.articleIndex);

        if (articles[index]) {
          openArticle(articles[index]);
        }
      });
    });
  };

  // 8. FETCH LATEST FIVE PUBLISHED ARTICLES FROM D1
  const loadNews = async () => {
    if (!newsGrid) return;

    try {
      const response = await fetch("/api/articles?limit=5", {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load news articles.");
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.articles)) {
        throw new Error("Invalid response from News API.");
      }

      displayArticles(data.articles.slice(0, 5));

    } catch (error) {
      console.error("KIZAZI RADIO News Error:", error);

      newsGrid.innerHTML = `
        <p class="news-message">
          We're unable to load the latest stories right now.
          Please try again later.
        </p>
      `;
    }
  };

  loadNews();

  // 9. NEWS AND ARTICLE STYLING
  const newsStyles = document.createElement("style");

  newsStyles.textContent = `
    .kizazi-news {
      background: #101014;
      border-top: 1px solid #29292f;
      border-bottom: 1px solid #29292f;
    }

    .news-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 22px;
    }

    .news-card {
      background: #18181d;
      border: 1px solid #29292f;
      transition: transform .25s, border-color .25s;
      min-width: 0;
    }

    .news-card:hover {
      transform: translateY(-5px);
      border-color: #e50909;
    }

    .news-image {
      display: block;
      width: 100%;
      height: 210px;
      padding: 0;
      border: 0;
      overflow: hidden;
      background: #202026;
      cursor: pointer;
    }

    .news-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform .4s;
    }

    .news-card:hover .news-image img {
      transform: scale(1.04);
    }

    .news-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #24242a, #111114);
      color: #fff;
    }

    .news-placeholder span {
      font-size: 11px;
      letter-spacing: 4px;
      color: #aaa;
    }

    .news-placeholder strong {
      font-size: 55px;
      font-weight: 900;
      letter-spacing: -4px;
      color: #e50909;
    }

    .news-content {
      padding: 22px;
    }

    .news-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 17px;
    }

    .news-meta span {
      color: #ff3030;
      font-size: 9px;
      font-weight: 850;
      letter-spacing: 1.4px;
    }

    .news-meta small {
      color: #85858e;
      font-size: 9px;
    }

    .news-content h3 {
      margin: 0 0 12px;
      font-size: 21px;
      line-height: 1.2;
      letter-spacing: -.5px;
    }

    .news-title-button {
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .news-title-button:hover {
      color: #ff3030;
    }

    .news-content p {
      color: #a5a5ad;
      font-size: 12px;
      line-height: 1.8;
      margin: 0 0 22px;
    }

    .news-read {
      display: inline-block;
      padding: 0 0 8px;
      border: 0;
      border-bottom: 1px solid #45454d;
      background: none;
      color: #fff;
      font-size: 9px;
      font-weight: 850;
      letter-spacing: 1.2px;
      cursor: pointer;
    }

    .news-read span {
      color: #e50909;
      margin-left: 7px;
    }

    .news-footer {
      margin-top: 30px;
    }

    .news-loading,
    .news-message {
      color: #aaa;
      font-size: 13px;
      line-height: 1.8;
      grid-column: 1 / -1;
    }

    /* ARTICLE MODAL */

    .news-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99999;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .news-modal.open {
      display: flex;
    }

    .news-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, .88);
      backdrop-filter: blur(7px);
    }

    .news-modal-panel {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 850px;
      max-height: 90vh;
      overflow-y: auto;
      background: #151519;
      border: 1px solid #35353c;
      color: #fff;
    }

    .news-modal-close {
      position: sticky;
      top: 12px;
      float: right;
      z-index: 3;
      margin: 12px 12px -55px 0;
      width: 42px;
      height: 42px;
      border: 1px solid #555;
      border-radius: 50%;
      background: #18181d;
      color: #fff;
      font-size: 27px;
      cursor: pointer;
    }

    .modal-article-image {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      display: block;
    }

    .modal-article-body {
      padding: 35px;
    }

    .modal-article-body h2 {
      font-size: clamp(27px, 5vw, 42px);
      line-height: 1.15;
      margin: 0 0 14px;
    }

    .modal-article-author {
      color: #ff3030;
      font-size: 11px;
      margin-bottom: 25px;
    }

    .modal-article-excerpt {
      color: #ddd;
      font-size: 16px;
      line-height: 1.8;
      border-left: 3px solid #e50909;
      padding-left: 16px;
      margin-bottom: 25px;
    }

    .modal-article-text {
      color: #c3c3ca;
      font-size: 14px;
      line-height: 2;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    .modal-article-footer {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      flex-wrap: wrap;
      border-top: 1px solid #35353c;
      margin-top: 35px;
      padding-top: 20px;
      color: #ff3030;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.2px;
    }

    @media(max-width: 850px) {
      .news-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media(max-width: 600px) {
      .news-grid {
        grid-template-columns: 1fr;
      }

      .news-image {
        height: 220px;
      }

      .news-modal {
        padding: 10px;
      }

      .modal-article-body {
        padding: 24px 20px;
      }

      .modal-article-body h2 {
        font-size: 27px;
      }
    }
  `;

  document.head.appendChild(newsStyles);

  // 10. ADD NEWS TO NAVIGATION
  if (nav && !nav.querySelector('a[href="#news"]')) {
    const newsLink = document.createElement("a");

    newsLink.href = "#news";
    newsLink.textContent = "News";

    const aboutLink = nav.querySelector('a[href="#about"]');

    if (aboutLink) {
      nav.insertBefore(newsLink, aboutLink);
    } else {
      nav.appendChild(newsLink);
    }

    newsLink.addEventListener("click", () => {
      nav.classList.remove("open");
      menu?.setAttribute("aria-expanded", "false");

      if (menu) {
        menu.textContent = "☰";
      }
    });
  }

  // 11. LIVE RADIO PLAYER STATUS
  const playButton = document.getElementById("play");
  const status = document.getElementById("status");

  if (playButton && status) {
    playButton.addEventListener("click", () => {
      status.textContent = "Stream URL not connected yet";
    });
  }
});
