import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { enableNotifications, pushSupported, registerPushToken } from '../lib/push';

export default function NotifyButton() {
  const [perm, setPerm] = useState(() => (pushSupported() ? Notification.permission : 'unsupported'));

  // Already allowed on an earlier visit: quietly refresh this browser's push token.
  useEffect(() => {
    if (perm === 'granted') registerPushToken().catch(() => {});
  }, [perm]);

  if (perm === 'unsupported') return null;

  const click = async () => {
    if (perm === 'granted') return toast('Notifications are on for this browser.', { icon: '🔔' });
    if (perm === 'denied') return toast.error('Notifications are blocked. Allow them in your browser\'s site settings.');
    const res = await enableNotifications();
    setPerm(res.permission);
    if (res.permission !== 'granted') return toast.error('Notifications were not allowed.');
    toast.success(res.push ? 'Push notifications enabled' : 'Alerts enabled while the CMS is open');
  };

  const Icon = perm === 'granted' ? BellRing : perm === 'denied' ? BellOff : Bell;
  const tip = perm === 'granted' ? 'Notifications on' : perm === 'denied' ? 'Notifications blocked' : 'Turn on notifications';
  return (
    <button type="button" className={`top-chip ${perm === 'granted' ? 'on' : ''}`} onClick={click} aria-label={tip}
      data-tooltip-id="tip" data-tooltip-place="bottom" data-tooltip-content={tip}>
      <Icon size={17} />
    </button>
  );
}
