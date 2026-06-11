// Google Analytics 4 (gtag.js). Loads ONLY when VITE_GA_MEASUREMENT_ID is set, so the
// app runs with zero analytics in development or when unconfigured. SPA-aware: GA4's
// automatic page_view is turned off (send_page_view: false) and we send one manually
// on every route change, so client-side navigation is captured without double-counting
// the initial load. Only the path is sent — never query strings — so no incidental
// data leaks into analytics.
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function isAnalyticsEnabled() {
  return Boolean(MEASUREMENT_ID);
}

// Injects the gtag loader and bootstraps GA4. Safe to call repeatedly — it only does
// work on the first call, and is a no-op when no measurement ID is configured.
export function initAnalytics() {
  if (initialized || !MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // The synchronous stub queues calls into dataLayer until the async script loads,
  // so trackPageView right after init is safe.
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

// Sends a single GA4 page_view for the given path (no query string).
export function trackPageView(path) {
  if (!MEASUREMENT_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: document.title,
  });
}
