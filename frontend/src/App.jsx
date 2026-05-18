import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ConsolePage from './pages/ConsolePage';
import SimulationPage from './pages/SimulationPage';
import StatsPage from './pages/StatsPage';
import DocsPage from './pages/DocsPage';
import { translations } from './translations';

function App() {
  const [lang, setLang] = useState('sk');
  const t = translations[lang];

  return (
    <Router>
      <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', backgroundColor: '#fff' }}>
        <Navbar lang={lang} setLang={setLang} t={t} />
        
        <Routes>
          <Route path="/" element={<ConsolePage t={t} />} />
          <Route path="/pendulum" element={<SimulationPage title={t.pendulum} t={t} />} />
          <Route path="/ball-beam" element={<SimulationPage title={t.ball_beam} t={t} />} />
          <Route path="/stats" element={<StatsPage t={t} />} />
          <Route path="/docs" element={<DocsPage t={t} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
