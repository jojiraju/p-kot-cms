import { useEffect, useState } from 'react';

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION = 2000; // ms
const easeOutQuart = (x) => 1 - (1 - x) ** 4;

// Same logo-ring loader as the website; shown once per page load / refresh.
export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [hiding, setHiding] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    let frame;
    let timer;
    let start;
    const tick = (ts) => {
      start ??= ts;
      const t = Math.min((ts - start) / DURATION, 1);
      setProgress(Math.round(easeOutQuart(t) * 100));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setHiding(true);
        timer = setTimeout(() => {
          setGone(true);
          document.body.style.overflow = '';
        }, 800);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`preloader ${hiding ? 'hide' : ''}`} role="status" aria-label="Loading">
      <div className="preloader-box">
        <svg className="preloader-ring" width="120" height="120">
          <circle cx="60" cy="60" r={RADIUS} fill="transparent" strokeWidth="2" className="preloader-track" />
          <circle
            cx="60" cy="60" r={RADIUS} fill="transparent" strokeWidth="2" className="preloader-arc"
            style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE }}
          />
        </svg>
        <div className="preloader-logo"><img src="/logo.png" alt="P-KOT Spices" /></div>
        <div className="preloader-text">{progress}%</div>
      </div>
    </div>
  );
}
