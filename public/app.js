
document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // KIZAZI RADIO - MAIN WEBSITE JAVASCRIPT
  // ==========================================

  // 1. UPDATE COPYRIGHT YEAR
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

  // 4. NEWS ARTICLES
  // Add your latest news articles inside this array.
  const newsArticles = [
    {
      category: "MUSIC",
      title: "Welcome to KIZAZI RADIO News",
      excerpt: "Get the latest music, entertainment and culture updates from KIZAZI RADIO.",
      date: "LATEST UPDATES",
      image: "",
      url: "#"
    },
    {
      category: "ENTERTAINMENT",
      title: "Music, Culture and Stories That Matter",
      excerpt: "Discover stories, conversations and updates from across the entertainment world.",
      date: "KIZAZI RADIO",
      image: "",
      url: "#"
    },
    {
      category: "RADIO",
      title: "Stay Connected With KIZAZI RADIO",
      excerpt: "Keep up with our radio shows, podcasts, events and latest announcements.",
      date: "KIZAZI RADIO",
      image: "",
      url: "#"
    }
  ];

  // 5. CREATE NEWS SECTION
  const newsSection = document.createElement("section");

  newsSection.className = "section kizazi-news";
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

      <div class="news-grid" id="newsGrid"></div>

      <div class="news-footer">
        <a href="#news" class="secondary">MORE STORIES ↗</a>
      </div>

    </div>
  `;

  // Insert News before the About section
  const aboutSection = document.querySelector("#about");

  if (aboutSection) {
    aboutSection.before(newsSection);
  } else {
    document.querySelector("main")?.appendChild(newsSection);
  }

  // 6. DISPLAY NEWS ARTICLES
  const newsGrid = document.getElementById("newsGrid");

  if (newsGrid) {
    newsGrid.innerHTML = newsArticles.map(article => `
      <article class="news-card">

        <a class="news-image" href="${article.url}">
          ${
            article.image
              ? `<img src="${article.image}" alt="${article.title}" loading="lazy">`
              : `<div class="news-placeholder">
                   <span>KIZAZI</span>
                   <strong>NEWS</strong>
                 </div>`
          }
        </a>

        <div class="news-content">

          <div class="news-meta">
            <span>${article.category}</span>
            <small>${article.date}</small>
          </div>

          <h3>
            <a href="${article.url}">${article.title}</a>
          </h3>

          <p>${article.excerpt}</p>

          <a class="news-read" href="${article.url}">
            READ STORY <span>↗</span>
          </a>

        </div>

      </article>
    `).join("");
  }

  // 7. NEWS STYLING
  const newsStyles = document.createElement("style");

  newsStyles.textContent = `
    .kizazi-news {
      background: #101014;
      border-top: 1px solid #29292f;
      border-bottom: 1px solid #29292f;
    }

    .news-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
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
      height: 210px;
      overflow: hidden;
      background: #202026;
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

    .news-content h3 a:hover {
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
      font-size: 9px;
      font-weight: 850;
      letter-spacing: 1.2px;
      border-bottom: 1px solid #45454d;
      padding-bottom: 8px;
    }

    .news-read span {
      color: #e50909;
      margin-left: 7px;
    }

    .news-footer {
      margin-top: 30px;
    }

    @media(max-width: 850px) {
      .news-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media(max-width: 600px) {
      .news-grid {
        grid-template-columns: 1fr;
      }

      .news-image {
        height: 220px;
      }
    }
  `;

  document.head.appendChild(newsStyles);

  // 8. ADD NEWS TO NAVIGATION
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

  // 9. LIVE RADIO PLAYER STATUS
  const playButton = document.getElementById("play");
  const status = document.getElementById("status");

  if (playButton && status) {
    playButton.addEventListener("click", () => {
      status.textContent = "Stream URL not connected yet";
    });
  }

});
