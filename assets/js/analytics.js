/* Cloudflare Web Analytics: privacy-first, no cookies, no consent banner needed.
   Paste your site token below (Cloudflare dashboard > Web Analytics > Manage site > JS snippet).
   Until the placeholder is replaced, nothing is loaded. */
(function (token) {
  if (!token || token.indexOf('PASTE_') === 0) return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: token }));
  document.head.appendChild(s);
})('PASTE_CLOUDFLARE_TOKEN_HERE');
