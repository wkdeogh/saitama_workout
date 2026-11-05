import test from "node:test";
import assert from "node:assert/strict";
import { adConfig, ADSENSE_CLIENT } from "../src/ads/adConfig.js";
import { loadAdSense } from "../src/ads/loadAdSense.js";

test("review mode disables real ads and legacy shared SDK configuration", () => {
  assert.deepEqual(adConfig({}), { mode: "off" });
  assert.deepEqual(adConfig({ DEV: true }), { mode: "off" });
  for (const mode of ["off", "connect", "invalid", "preview"]) {
    assert.deepEqual(adConfig({ VITE_ADS_MODE: mode }), { mode: "off" });
  }
  assert.deepEqual(adConfig({ DEV: true, VITE_ADS_MODE: "preview" }), {
    mode: "preview",
  });
  assert.deepEqual(
    adConfig({ VITE_ADS_MODE: "connect", VITE_ADS_APPROVED: "true" }),
    { mode: "off" },
  );
});

test("future manual ads require explicit approval and a valid real unit", () => {
  const manual = {
    VITE_ADS_MODE: "adsense",
    VITE_ADSENSE_CLIENT: "ca-pub-1234567890123456",
    VITE_ADSENSE_SLOT: "1234567890",
  };
  for (const approved of [undefined, false, true, "false", "1"])
    assert.deepEqual(adConfig({ ...manual, VITE_ADS_APPROVED: approved }), {
      mode: "off",
    });
  for (const values of [
    { VITE_ADSENSE_CLIENT: "ca-pub-123" },
    { VITE_ADSENSE_SLOT: "" },
    { VITE_ADSENSE_SLOT: "<script>" },
  ])
    assert.deepEqual(
      adConfig({ ...manual, ...values, VITE_ADS_APPROVED: "true" }),
      { mode: "off" },
    );
  assert.deepEqual(adConfig({ ...manual, VITE_ADS_APPROVED: "true" }), {
    mode: "adsense",
    client: manual.VITE_ADSENSE_CLIENT,
    slot: manual.VITE_ADSENSE_SLOT,
  });
});

function fakeDocument() {
  const scripts = [];
  return {
    scripts,
    head: { appendChild: (script) => scripts.push(script) },
    createElement: () => ({
      remove() {
        this.removed = true;
      },
    }),
  };
}

test("concurrent mounts and later tab visits share one async SDK loader", async () => {
  const doc = fakeDocument();
  const first = loadAdSense(ADSENSE_CLIENT, doc);
  const second = loadAdSense(ADSENSE_CLIENT, doc);
  assert.equal(first, second);
  assert.equal(doc.scripts.length, 1);
  assert.equal(
    doc.scripts[0].src,
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6094417231997652",
  );
  assert.equal(doc.scripts[0].async, true);
  assert.equal(doc.scripts[0].crossOrigin, "anonymous");
  doc.scripts[0].onload();
  await first;
  assert.equal(loadAdSense(ADSENSE_CLIENT, doc), first);
});

test("blocked SDK fails without creating reload loops on tab changes", async () => {
  const doc = fakeDocument();
  const promise = loadAdSense("ca-pub-1234567890123456", doc);
  const rejected = assert.rejects(promise, /광고를 불러올 수 없음/);
  doc.scripts[0].onerror();
  await rejected;
  assert.equal(doc.scripts[0].removed, true);
  assert.equal(loadAdSense("ca-pub-1234567890123456", doc), promise);
  assert.equal(doc.scripts.length, 1);
});

test("SDK timeout settles and a late load cannot start ad requests", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const doc = fakeDocument();
  const promise = loadAdSense("ca-pub-1234567890123456", doc);
  const rejected = assert.rejects(promise, /시간 초과/);
  t.mock.timers.tick(15000);
  await rejected;
  doc.scripts[0].onload();
  await assert.rejects(promise, /시간 초과/);
  assert.equal(doc.scripts[0].removed, true);
});

test("publisher identity is retained independently of ad delivery", () => {
  assert.equal(ADSENSE_CLIENT, "ca-pub-6094417231997652");
  assert.deepEqual(
    adConfig({ VITE_ADS_MODE: "adsense", VITE_ADS_APPROVED: "true" }),
    { mode: "off" },
  );
});
