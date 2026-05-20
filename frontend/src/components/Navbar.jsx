import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ lang, setLang, t }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { path: '/',          label: t.console    },
    { path: '/pendulum',  label: t.pendulum   },
    { path: '/ball-beam', label: t.ball_beam  },
    { path: '/stats',     label: t.stats      },
    { path: '/docs',      label: t.docs       },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">{t.title}</div>

      {/* desktop + open mobile links */}
      <div className={`navbar-links${open ? ' open' : ''}`}>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            style={{
              color: location.pathname === item.path ? '#61dafb' : 'white',
              fontWeight: location.pathname === item.path ? 'bold' : 'normal',
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        <button
          onClick={() => setLang(lang === 'sk' ? 'en' : 'sk')}
          style={{ padding: '5px 10px', cursor: 'pointer', background: '#61dafb', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          {lang.toUpperCase()}
        </button>

        {/* hamburger — visible on mobile only via CSS */}
        <button
          className="navbar-hamburger"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
