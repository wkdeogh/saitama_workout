import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { guidePages } from "../content/publicGuide.js";
import {
  recordExp,
  saveRecord,
  initialData,
  stats,
  DAILY_WORKOUT_LIMITS,
} from "../src/model.js";
import { mergeGuestData } from "../src/cloud/guestStorage.js";
const origin = "https://saitama-workout.vercel.app";

test("every public guide is readable HTML with working local navigation, both languages and no ad requests", async () => {
  for (const lang of ["ko", "en"])
    for (const page of guidePages) {
      const name = `guide/${lang === "en" ? "en/" : ""}${page.slug}.html`;
      const html = await readFile(`public/${name}`, "utf8");
      assert.match(html, new RegExp(`<html lang="${lang}">`));
      assert.ok(html.includes(page[lang].lead));
      assert.equal((html.match(/<h1>/g) || []).length, 1);
      assert.match(html, /<article>/);
      assert.ok(
        !/<script\b|<ins\b|pagead2\.googlesyndication\.com|adsbygoogle\.push/.test(
          html,
        ),
      );
      assert.ok(html.includes(`${origin}/${name}`));
      assert.match(html, /hreflang="ko"/);
      assert.match(html, /hreflang="en"/);
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        if (href.startsWith("#") || href.startsWith("mailto:")) continue;
        const url = new URL(href, `${origin}/${name}`);
        if (url.origin !== origin) continue;
        const file =
          url.pathname === "/" ? "index.html" : `public${url.pathname}`;
        await assert.doesNotReject(access(file), `${name} -> ${href}`);
      }
    }
});

test("published examples remain consistent with the actual workout and account rules", async () => {
  const record = { pushups: 40, squats: 30, situps: 20, runningKm: 1 };
  const day = "2026-11-05";
  const data = saveRecord(initialData(), day, record, day);
  assert.equal(recordExp(record), 110);
  assert.equal(stats(data, day).level, 2);
  assert.equal(stats(data, day).progressExp, 10);
  assert.equal(
    recordExp({ pushups: 30, squats: 20, situps: 10, runningKm: 1.5 }),
    90,
  );
  const account = saveRecord(
    initialData(),
    day,
    { pushups: 40, squats: 10, situps: 0, runningKm: 0 },
    day,
  );
  const guest = saveRecord(
    initialData(),
    day,
    { pushups: 25, squats: 30, situps: 0, runningKm: 0 },
    day,
  );
  const merged = mergeGuestData(account, guest);
  assert.equal(merged.records[day].pushups, 40);
  assert.equal(merged.records[day].squats, 30);
  assert.deepEqual(DAILY_WORKOUT_LIMITS, {
    pushups: 300,
    squats: 300,
    situps: 300,
    runningKm: 60,
  });
  const sitemap = await readFile("public/sitemap.xml", "utf8");
  for (const lang of ["ko", "en"])
    for (const page of guidePages)
      assert.ok(
        sitemap.includes(
          `/guide/${lang === "en" ? "en/" : ""}${page.slug}.html`,
        ),
      );
});

test("app keeps ownership verification and public links without mounting any ad runtime", async () => {
  const app = await readFile("src/App.jsx", "utf8");
  assert.doesNotMatch(
    app,
    /import .*AdSenseRuntime|import .*AdCard|<AdSenseRuntime\b|<AdCard\b/,
  );
  assert.match(app, /<PublicGuideLink/);
  const html = await readFile("index.html", "utf8");
  assert.match(html, /name="google-adsense-account"/);
  assert.match(html, /<noscript>/);
  assert.match(html, /guide\/index.html/);
  assert.match(
    await readFile("public/ads.txt", "utf8"),
    /pub-6094417231997652, DIRECT/,
  );
});
