/**
 * Partials loader for index.html:
 * - Load header + auth modal + pages from /Frontend/partials/*.html
 * - Insert into placeholders (#app-header, #app-auth-modal, #app-pages)
 *
 * Note: fetch local html requires serving Frontend via http/https.
 */
function loadPartialInto(selector, url) {
  return fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load partial: ${url} (status ${r.status})`);
      return r.text();
    })
    .then(html => {
      const host = document.querySelector(selector);
      if (!host) throw new Error(`Host not found: ${selector}`);
      host.innerHTML = html;
    });
}

function fetchPartial(url) {
  return fetch(url, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error(`Failed to load partial: ${url} (status ${r.status})`);
    return r.text();
  });
}

function loadPagesInto(selector, urls) {
  return Promise.all(urls.map(fetchPartial)).then(parts => {
    const host = document.querySelector(selector);
    if (!host) throw new Error(`Host not found: ${selector}`);
    host.innerHTML = parts.join('\n');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    loadPartialInto('#app-header', 'partials/header.html'),
    loadPartialInto('#app-auth-modal', 'partials/auth-modal.html'),
    loadPagesInto('#app-pages', [
      'partials/page-home.html',
      'partials/page-list.html',
      'partials/page-detail.html',
      'partials/page-read.html',
      'partials/page-profile.html',
      'partials/page-admin.html'
    ])
  ])
    .then(() => {
      window.dispatchEvent(new Event('partials:loaded'));
    })
    .catch(err => {
      console.error(err);
      // Fallback: leave placeholders empty
    });
});

