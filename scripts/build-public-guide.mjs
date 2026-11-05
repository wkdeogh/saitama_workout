import { mkdir, writeFile } from "node:fs/promises";
import { guidePages } from "../content/publicGuide.js";

const origin = "https://saitama-workout.vercel.app";
const escape = (text) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const langs = {
  ko: {
    brand: "빡빡이훈련소",
    guide: "이용 안내",
    open: "앱 열기",
    skip: "본문으로 이동",
    updated: "문서 기준",
    home: "안내 홈",
    next: "다음 안내",
    privacy: "개인정보처리방침",
    contact: "운영 문의",
    all: "전체 안내",
    time: "읽기",
    minute: "분",
    footer: "운동 기록과 캐릭터 성장의 연결을 설명합니다.",
    figures: ["기록할 운동", "레벨당 EXP", "최대 레벨"],
    roots: ["guide/", "guide/en/"],
  },
  en: {
    brand: "BBAKBAK Training",
    guide: "User guide",
    open: "Open app",
    skip: "Skip to content",
    updated: "Last reviewed",
    home: "Guide home",
    next: "Read next",
    privacy: "Privacy policy",
    contact: "Contact",
    all: "All guides",
    time: "Read time",
    minute: "min",
    footer: "How workout records connect to character growth.",
    figures: ["Exercise fields", "EXP per level", "Maximum level"],
    roots: ["guide/en/", "guide/"],
  },
};
const entries = [];
for (const lang of ["ko", "en"]) {
  const t = langs[lang],
    root = lang === "en" ? "../../" : "../";
  const folder = `public/guide/${lang === "en" ? "en/" : ""}`;
  await mkdir(folder, { recursive: true });
  for (const [index, page] of guidePages.entries()) {
    const p = page[lang],
      file = `${page.slug}.html`;
    const url = `${origin}/guide/${lang === "en" ? "en/" : ""}${file}`;
    const alternate = lang === "en" ? `../${file}` : `en/${file}`;
    const nav = guidePages
      .map(
        (item, i) =>
          `<a href="${item.slug}.html"${item.slug === page.slug ? ' aria-current="page"' : ""}><span>${String(i + 1).padStart(2, "0")}</span>${escape(item[lang].label)}</a>`,
      )
      .join("");
    const sections = p.sections
      .map(
        ([title, body], i) =>
          `<section id="section-${i + 1}"><h2>${escape(title)}</h2>${body}</section>`,
      )
      .join("\n");
    const next = guidePages[(index + 1) % guidePages.length];
    const cover =
      index === 0
        ? `<div class="facts" aria-label="${lang === "ko" ? "서비스 기본 수치" : "App basics"}">${["4", "100", "1000"].map((n, i) => `<div><strong>${n}</strong><span>${t.figures[i]}</span></div>`).join("")}</div>`
        : "";
    const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(p.label)} · ${t.brand}</title>
<meta name="description" content="${escape(p.description)}">
<meta name="theme-color" content="#ffdf48">
<meta name="google-adsense-account" content="ca-pub-6094417231997652">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ko" href="${origin}/guide/${file}">
<link rel="alternate" hreflang="en" href="${origin}/guide/en/${file}">
<link rel="alternate" hreflang="x-default" href="${origin}/guide/${file}">
<link rel="icon" href="${root}icons/new-logo-transparent-32.png">
<link rel="stylesheet" href="${lang === "en" ? "../" : ""}guide.css">
</head>
<body>
<a class="skip" href="#content">${t.skip}</a>
<header class="guide-header"><div class="header-wrap"><a class="guide-brand" href="index.html"><img src="${root}icons/new-logo-transparent-192.png" width="36" height="36" alt=""><span>${t.brand}<small>FIELD NOTES / ${t.guide}</small></span></a><div class="header-links"><a class="language" href="${alternate}" lang="${lang === "en" ? "ko" : "en"}" hreflang="${lang === "en" ? "ko" : "en"}">${lang === "en" ? "한국어" : "English"}</a><a class="app-link" href="${root}">${t.open}<span aria-hidden="true"> ↗</span></a></div></div></header>
<div class="guide-layout"><nav class="guide-nav" aria-label="${t.all}"><p>${t.all}</p>${nav}</nav>
<main id="content" tabindex="-1"><article><div class="article-meta"><span class="category">${String(index + 1).padStart(2, "0")} / ${t.guide}</span><span>${t.updated} <time datetime="2026-11-05">2026.11.05</time></span></div><h1>${escape(p.title)}</h1><p class="lead">${escape(p.lead)}</p>${cover}<div class="article-body">${sections}</div><a class="next-guide" href="${next.slug}.html"><span><small>${t.next}</small><strong>${escape(next[lang].label)}</strong></span><span aria-hidden="true">→</span></a></article></main></div>
<footer class="guide-footer"><div><strong>${t.brand}</strong><p>${t.footer}</p></div><nav aria-label="${lang === "ko" ? "관련 링크" : "Related links"}"><a href="${root}${lang === "en" ? "privacy-en.html" : "privacy.html"}">${t.privacy}</a><a href="mailto:wkdeoghq@gmail.com">${t.contact}</a><a href="${root}">${t.open}</a></nav><small>© 2026 BBAKBAK TRAINING</small></footer>
</body></html>\n`;
    await writeFile(`${folder}${file}`, html);
    entries.push(url);
  }
}
const urls = [
  `${origin}/`,
  ...entries,
  `${origin}/privacy.html`,
  `${origin}/privacy-en.html`,
];
await writeFile(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`,
);
console.log(`Built ${entries.length} public guide pages and sitemap.`);
