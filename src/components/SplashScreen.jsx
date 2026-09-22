import { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 2400);
    const t3 = setTimeout(() => onComplete(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`splash-screen splash-${phase}`}>
      <div className="splash-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="splash-particle"
            style={{
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
              '--size': `${Math.random() * 4 + 1}px`,
              '--delay': `${Math.random() * 3}s`,
              '--duration': `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      <div className="splash-rings">
        <div className="splash-ring splash-ring-1" />
        <div className="splash-ring splash-ring-2" />
        <div className="splash-ring splash-ring-3" />
      </div>

      <div className="splash-center">
        <div className="splash-logo-wrap">
          <div className="splash-glow" />
          <div className="splash-logo">S</div>
          <svg className="splash-ring-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6C5CE7" />
                <stop offset="50%" stopColor="#00CEC9" />
                <stop offset="100%" stopColor="#FD79A8" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="56" />
          </svg>
        </div>

        <div className="splash-texts">
          <h1 className="splash-title">Savdo Apparati</h1>
          <p className="splash-subtitle">POS Tizimi</p>
        </div>

        <div className="splash-progress">
          <div className="splash-progress-bar" />
        </div>

        <div className="splash-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
