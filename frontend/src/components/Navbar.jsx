import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ lang, setLang, t }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: t.console },
    { path: '/pendulum', label: t.pendulum },
    { path: '/ball-beam', label: t.ball_beam },
    { path: '/stats', label: t.stats },
    { path: '/docs', label: t.docs },
  ];

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#282c34', color: 'white', alignItems: 'center' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{t.title}</div>
      <div style={{ display: 'flex', gap: '15px' }}>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            style={{ 
              color: location.pathname === item.path ? '#61dafb' : 'white', 
              textDecoration: 'none',
              fontWeight: location.pathname === item.path ? 'bold' : 'normal'
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div>
        <button 
          onClick={() => setLang(lang === 'sk' ? 'en' : 'sk')}
          style={{ padding: '5px 10px', cursor: 'pointer', background: '#61dafb', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          {lang.toUpperCase()}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;