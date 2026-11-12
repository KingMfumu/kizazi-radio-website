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

  const safeYouTubeURL = value => {
    if (!value) return "";

    try {
      const url = new URL(value);

      const allowedHosts = [
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "m.youtube.com"
      ];

      if (
        allowedHosts.includes(url.hostname) &&
        ["https:", "http:"].includes(url.protocol)
      ) {
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

  // ==========================================
  // 5. TOP 15 MUSIC CHART SECTION
  // ==========================================

  const chartSection = document.createElement("section");

  chartSection.className = "section kizazi-chart";
  chartSection.id = "top15";

  chartSection.innerHTML = `
    <div class="wrap">

      <div class="section-head">
        <span class="num">02</span>

        <div>
          <p class="eyebrow">The official music countdown</p>
          <h2 class="section-title">
            TOP 15 <em>MUSIC CHART.</em>
          </h2>
        </div>
      </div>

      <div class="chart-grid" id="homepageChart">
        <p class="chart-loading">Loading TOP 15 Music Chart...</p>
      </div>

      <div class="chart-footer">
        <span>THE OFFICIAL KIZAZI RADIO TOP 15</span>
        <a href="/top15/" class="chart-view-all">VIEW FULL CHART ↗</a>
      </div>

    </div>
  `;

  const main = document.querySelector("main");

  if (main) {
    const existingChart = document.getElementById("top15");

    if (!existingChart) {
      const existingNews = document.getElementById("news");

      if (existingNews) {
        existingNews.before(chartSection);
      } else {
        const aboutSection = document.querySelector("#about");

        if (aboutSection) {
          aboutSection.after(chartSection);
        } else {
          main.appendChild(chartSection);
        }
      }
    }
  }

  // 6. LOAD TOP 15 SONGS
  const chartGrid = document.getElementById("homepageChart");

  const displayChart = songs => {
    if (!chartGrid) return;

    if (!Array.isArray(songs) || songs.length === 0) {
      chartGrid.innerHTML = `
        <p class="chart-message">
          The TOP 15 Music Chart is coming soon.
          Check back for the latest music countdown.
        </p>
      `;
      return;
    }

    const sortedSongs = [...songs]
      .sort((a, b) => Number(a.position) - Number(b.position))
      .slice(0, 5);

    chartGrid.innerHTML = sortedSongs.map(song => {
      const artwork = safeImageURL(song.artwork_url);
      const youtube = safeYouTubeURL(song.youtube_url);

      return `
        <article class="chart-card">

          <div class="chart-artwork">

            ${
              artwork
                ? `<img
                     src="${escapeHTML(artwork)}"
                     alt="${escapeHTML(song.song_title)} by ${escapeHTML(song.artist_name)}"
                     loading="lazy">`
                : `<div class="chart-placeholder">
                     <span>KIZAZI</span>
                     <strong>MUSIC</strong>
                   </div>`
            }

            <span class="chart-position">
              <small>NO.</small>
              <strong>${escapeHTML(song.position)}</strong>
            </span>

            <span class="chart-watermark">KIZAZI TOP 15</span>

          </div>

          <div class="chart-song-info">

            <h3>${escapeHTML(song.song_title)}</h3>

            <p>${escapeHTML(song.artist_name)}</p>

            <div class="chart-card-footer">
              <span>POSITION #${escapeHTML(song.position)}</span>

              ${
                youtube
                  ? `<a
                       href="${escapeHTML(youtube)}"
                       class="chart-listen"
                       target="_blank"
                       rel="noopener noreferrer">
                       <span>▶</span> WATCH
                     </a>`
                  : `<span class="chart-unavailable">
                       VIDEO UNAVAILABLE
                     </span>`
              }
            </div>

          </div>

        </article>
      `;
    }).join("");
  };

  const loadMusicChart = async () => {
    if (!chartGrid) return;

    try {
      const response = await fetch("/api/music-chart", {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load music chart.");
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.chart)) {
        throw new Error("Invalid Music Chart API response.");
      }

      displayChart(data.chart);

    } catch (error) {
      console.error("KIZAZI RADIO Music Chart Error:", error);

      chartGrid.innerHTML = `
        <p class="chart-message">
          We're unable to load the music chart right now.
          Please check again later.
        </p>
      `;
    }
  };

  loadMusicChart();

  // ==========================================
  // 7. FIND AND REUSE HOMEPAGE NEWS SECTION
  // ==========================================

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

  // 8. ARTICLE MODAL
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

  // 9. DISPLAY ARTICLES
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

  // 10. FETCH LATEST THREE PUBLISHED ARTICLES
  const loadNews = async () => {
    if (!newsGrid) return;

    try {
      const response = await fetch("/api/articles?limit=3", {
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

      displayArticles(data.articles.slice(0, 3));

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

  // ==========================================
  // 11. HOMEPAGE STYLING
  // ==========================================

  const websiteStyles = document.createElement("style");

  websiteStyles.textContent = `

    /* TOP 15 MUSIC CHART */

    .kizazi-chart {
      background:
        radial-gradient(ellipse at 50% 0%, rgba(229, 9, 9, .09), transparent 55%),
        #090909;
      border-top: 1px solid #29292f;
      border-bottom: 1px solid #29292f;
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 20px;
    }

    .chart-card {
      min-width: 0;
      overflow: hidden;
      background: #151515;
      border: 1px solid #303030;
      border-radius: 7px;
      transition: transform .25s, border-color .25s, box-shadow .25s;
    }

    .chart-card:hover {
      transform: translateY(-6px);
      border-color: #e50909;
      box-shadow: 0 12px 35px rgba(229, 9, 9, .12);
    }

    .chart-artwork {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      background: #202026;
    }

    .chart-artwork::after {
      content: "";
      position: absolute;
      inset: 55% 0 0;
      background: linear-gradient(transparent, rgba(0,0,0,.7));
      pointer-events: none;
    }

    .chart-artwork img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      transition: transform .5s;
    }

    .chart-card:hover .chart-artwork img {
      transform: scale(1.06);
    }

    .chart-position {
      position: absolute;
      z-index: 2;
      top: 16px;
      left: 16px;
      width: 61px;
      height: 61px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #e50909;
      color: #fff;
      line-height: 1;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
    }

    .chart-position small {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }

    .chart-position strong {
      font-size: 28px;
      font-weight: 950;
    }

    .chart-watermark {
      position: absolute;
      z-index: 2;
      bottom: 13px;
      left: 15px;
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 2px;
      text-shadow: 0 2px 5px #000;
    }

    .chart-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #24242a, #111114);
      color: #fff;
    }

    .chart-placeholder span {
      font-size: 10px;
      letter-spacing: 4px;
      color: #aaa;
    }

    .chart-placeholder strong {
      font-size: 30px;
      font-weight: 900;
      color: #e50909;
    }

    .chart-song-info {
      padding: 20px 18px 17px;
    }

    .chart-song-info h3 {
      color: #fff;
      font-size: 17px;
      line-height: 1.35;
      margin: 0 0 9px;
      overflow-wrap: anywhere;
    }

    .chart-song-info p {
      color: #999;
      font-size: 13px;
      line-height: 1.5;
      min-height: 20px;
      margin: 0 0 25px;
      overflow-wrap: anywhere;
    }

    .chart-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding-top: 14px;
      border-top: 1px solid #353535;
    }

    .chart-card-footer > span:first-child {
      color: #777;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }

    .chart-listen {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 94px;
      padding: 11px 13px;
      background: #e50909;
      color: #fff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
      text-decoration: none;
      transition: background .2s;
    }

    .chart-listen:hover {
      background: #b90000;
    }

    .chart-listen span {
      font-size: 10px;
    }

    .chart-unavailable {
      color: #777;
      font-size: 9px;
      letter-spacing: 1px;
    }

    .chart-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      margin-top: 38px;
      padding-top: 25px;
      border-top: 1px solid #303030;
    }

    .chart-footer > span {
      color: #777;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
    }

    .chart-view-all {
      display: inline-block;
      padding: 17px 25px;
      background: #e50909;
      color: #fff;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 1.2px;
      text-decoration: none;
      transition: background .2s, transform .2s;
    }

    .chart-view-all:hover {
      background: #b90000;
      transform: translateY(-2px);
    }

    .chart-loading,
    .chart-message {
      color: #aaa;
      font-size: 13px;
      line-height: 1.8;
      grid-column: 1 / -1;
    }

    /* NEWS */

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

    @media(max-width: 1100px) {
      .chart-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media(max-width: 850px) {
      .news-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media(max-width: 600px) {
      .chart-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .chart-position {
        top: 9px;
        left: 9px;
        width: 45px;
        height: 45px;
      }

      .chart-position strong {
        font-size: 22px;
      }

      .chart-song-info {
        padding: 12px;
      }

      .chart-song-info h3 {
        font-size: 13px;
      }

      .chart-song-info p {
        font-size: 11px;
        margin-bottom: 15px;
      }

      .chart-card-footer {
        align-items: flex-start;
        flex-direction: column;
      }

      .chart-listen {
        min-width: 100%;
      }

      .chart-footer {
        align-items: flex-start;
        flex-direction: column;
      }

      .chart-view-all {
        width: 100%;
        text-align: center;
      }

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

  document.head.appendChild(websiteStyles);

  // ==========================================
  // 12. ADD NEWS AND TOP 15 TO NAVIGATION
  // ==========================================

  if (nav && !nav.querySelector('a[href="#top15"]')) {
    const chartLink = document.createElement("a");

    chartLink.href = "#top15";
    chartLink.textContent = "TOP 15";

    const aboutLink = nav.querySelector('a[href="#about"]');

    if (aboutLink) {
      nav.insertBefore(chartLink, aboutLink);
    } else {
      nav.appendChild(chartLink);
    }
  }

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
  }

  // 13. LIVE RADIO PLAYER STATUS
  const playButton = document.getElementById("play");
  const status = document.getElementById("status");

  if (playButton && status) {
    playButton.addEventListener("click", () => {
      status.textContent = "Stream URL not connected yet";
    });
  }
});
