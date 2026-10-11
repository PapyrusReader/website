(() => {
  'use strict';
  const endpoints = { api: 'https://api.papyrus-reader.com/health', sync: 'https://sync.papyrus-reader.com/probes/readiness' };
  const labels = { healthy: 'Responding', unavailable: 'Unavailable', unknown: 'Unable to check' };
  const button = document.getElementById('refresh-status');
  const summary = document.getElementById('status-summary');
  let running = false;
  let timer;
  async function refresh() {
    if (running || document.hidden) return;
    clearTimeout(timer);
    running = true;
    button.disabled = true;
    summary.textContent = 'Checking services…';
    const results = await Promise.all(Object.entries(endpoints).map(async ([service, url]) => {
      const card = document.querySelector(`[data-service="${service}"]`);
      const badge = card.querySelector('.service-state');
      badge.textContent = 'Checking…';
      badge.dataset.state = 'unknown';
      const result = await window.PapyrusSite.checkService(url, service);
      badge.textContent = labels[result.state];
      badge.dataset.state = result.state;
      card.querySelector('.service-detail').textContent = `${result.message} · Checked ${new Date().toLocaleTimeString()}`;
      return result;
    }));
    summary.textContent = results.every(result => result.state === 'healthy') ? 'All services responding' : 'Some checks need attention';
    button.disabled = false;
    running = false;
    timer = setTimeout(refresh, 60000);
  }
  button.hidden = false;
  button.addEventListener('click', refresh);
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) refresh();
  });
  refresh();
})();
