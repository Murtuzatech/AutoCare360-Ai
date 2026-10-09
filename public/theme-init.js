// Applies the saved theme before first paint to avoid a flash. Kept as a separate file so the site can use a strict Content-Security-Policy.
try {
  var p = localStorage.getItem('autocare-theme') || 'system';
  var dark = p === 'dark' || (p === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
} catch (e) {}
