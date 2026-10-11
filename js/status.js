(() => {
  'use strict';
  const labels = { operational: 'Operational', disrupted: 'Service disruption', unknown: 'Status unavailable' };
  const summary = document.getElementById('status-summary');
  const updated = document.getElementById('status-updated');
  let running = false;
  async function refresh() {
    if (running || document.hidden) return;
    running = true;
    try {
      const response = await fetch('/status.json', { credentials: 'omit', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Status unavailable');
      const result = window.PapyrusSite.serviceStatus(await response.json());
      for (const [service, state] of Object.entries(result.states)) {
        const badge = document.querySelector(`[data-service="${service}"] .service-state`);
        badge.textContent = labels[state];
        badge.dataset.state = state;
      }
      summary.textContent = Object.values(result.states).every(state => state === 'operational') ? 'All systems operational' : 'Service disruption';
      updated.textContent = `Updated ${new Date(result.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      summary.textContent = 'Status unavailable';
      updated.textContent = '';
      for (const badge of document.querySelectorAll('.service-state')) {
        badge.textContent = labels.unknown;
        badge.dataset.state = 'unknown';
      }
    } finally {
      running = false;
    }
  }
  // Visitors read a cached snapshot. Only the scheduled monitor probes services.
  refresh();
  setInterval(refresh, 60000);
})();
