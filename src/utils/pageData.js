// Data a pre-rendered page ships with (scripts/lib/pageHtml.js writes it into
// <script id="page-data"> inside #page-content), so the app can draw the real
// page straight away instead of waiting for Firestore. Read once, before React
// replaces #page-content; the inline script in public/index.html has already
// removed it if it belongs to a different URL. Live data still loads as usual
// and replaces it.
function read() {
  try {
    const element = document.getElementById('page-data');
    return element ? JSON.parse(element.textContent) : {};
  } catch {
    return {};
  }
}

export const pageData = read();
