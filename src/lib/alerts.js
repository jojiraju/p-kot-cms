import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

// Two-tone chime; browsers may block audio until the page has had a click, so failures are ignored.
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch { /* audio unavailable */ }
}

function announce({ title, body, tag }) {
  toast(`${title} · ${body}`, { icon: '🔔', duration: 6000 });
  chime();
  // A system notification is only useful when the tab is not in front of the user.
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && !document.hasFocus()) {
    try { new Notification(title, { body, icon: '/logo.png', tag }); } catch { /* ignore */ }
  }
}

/**
 * Fires an alert for every document that appears in a live collection after the first load.
 * `describe(doc)` returns { title, body }.
 */
export function useNewItemAlerts({ items, loading }, describe) {
  const seen = useRef(null);
  useEffect(() => {
    if (loading) return;
    const ids = new Set(items.map((i) => i.id));
    if (seen.current === null) { seen.current = ids; return; }
    const fresh = items.filter((i) => !seen.current.has(i.id));
    seen.current = ids;
    fresh.forEach((i) => announce({ ...describe(i), tag: i.id }));
  }, [items, loading]); // eslint-disable-line react-hooks/exhaustive-deps
}
