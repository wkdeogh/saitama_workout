// One loader per document, shared by React StrictMode and tab remounts.
const loaders = new WeakMap();

export function loadAdSense(client, doc = document) {
  const previous = loaders.get(doc);
  if (previous) return previous;
  const promise = new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error("광고 로드 시간 초과"));
    }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error("광고를 불러올 수 없음"));
    };
    doc.head.appendChild(script);
  });
  // Keep failures cached too: tab changes must not create retry loops.
  loaders.set(doc, promise);
  return promise;
}
