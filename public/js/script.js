/**
 * script.js — Shared utilities for UPI Savings Bank
 * Loaded on pages that need common helpers.
 */

/* ── Toast helper (used by dashboard & other pages) ── */
function showToast(msg, type = '') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText =
      'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(100px);' +
      'padding:14px 24px;border-radius:100px;font-size:.88rem;font-weight:500;' +
      'z-index:9999;transition:transform .3s;pointer-events:none;color:white;';
    document.body.appendChild(t);
  }
  const colors = { success: '#1a7c6e', error: '#991b1b', '': '#0a0a0f' };
  t.style.background = colors[type] || colors[''];
  t.textContent = msg;
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(100px)'; }, 3000);
}

/* ── Format INR ── */
function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ── Copy to clipboard ── */
function copyText(text, label = 'Copied!') {
  navigator.clipboard.writeText(text)
    .then(() => showToast(label, 'success'))
    .catch(() => showToast('Copy failed', 'error'));
}
