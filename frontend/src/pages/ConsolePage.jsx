import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EditorModule from 'react-simple-code-editor'; // Načítame ako modul
import Prism from 'prismjs';
import 'prismjs/components/prism-matlab'; // Octave/Matlab syntax
import 'prismjs/themes/prism-tomorrow.css'; // Pekná tmavá téma pre kód

// OŠETRENIE VITE INTEROP: Ak Vite naimportoval objekt, vytiahneme z neho .default komponent
const Editor = EditorModule.default || EditorModule;

const ConsolePage = ({ t }) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  // Vygenerovanie alebo načítanie unikátnego ID relácie pre pamäť premenných
  useEffect(() => {
    let sId = sessionStorage.getItem('cas_session_id');
    if (!sId) {
      // OPRAVENÉ: Správne spojenie textových reťazcov pomocou +
      sId = 'sess_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('cas_session_id', sId);
    }
    setSessionId(sId);
  }, []);

  // Konfigurácia hlavičiek pre Axios (API kľúč sa posiela bezpečne)
  const apiConfig = {
    headers: {
      'X-API-KEY': 'moje_supertajne_api_heslo_123', // Musí sedieť s CAS_API_KEY v .env na backende
      'Content-Type': 'application/json'
    }
  };

  const handleExecute = async () => {
    if (!command.trim()) return;
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8080/api/cas/execute', {
        command: command,
        session_id: sessionId
      }, apiConfig);

      setOutput(prev => prev + `\n>> ${command}\n${response.data.output}`);
      setCommand('');
    } catch (error) {
      const errorOutput = error.response?.data?.output || error.response?.data?.message || 'Chyba spojenia.';
      setOutput(prev => prev + `\n>> ${command}\n[CHYBA]: ${errorOutput}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearMemory = async () => {
    try {
      await axios.post('http://localhost:8080/api/cas/clear', { session_id: sessionId }, apiConfig);
      setOutput(prev => prev + '\n\n[Systém]: Pamäť premenných v Octave bola resetovaná.');
    } catch (error) {
      alert('Nepodarilo sa vymazať pamäť.');
    }
  };

  const handleDownloadCsv = () => {
    window.open('http://localhost:8080/api/cas/export', '_blank');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t.console}</h2>
        <button 
          onClick={handleDownloadCsv}
          style={{ padding: '8px 15px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          📥 Exportovať CSV logy
        </button>
      </div>

      <p style={{ fontSize: '0.9rem', color: '#666' }}>ID tvojej relácie: <code>{sessionId}</code></p>

      <div style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px', minHeight: '120px', backgroundColor: '#2d2d2d' }}>
        <Editor
          value={command}
          onValueChange={code => setCommand(code)}
          highlight={code => Prism.highlight(code, Prism.languages.matlab, 'matlab')}
          padding={15}
          placeholder={t.placeholder}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 16,
            minHeight: '120px',
            color: '#ccc'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={handleExecute} 
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          {loading ? 'Počíta sa...' : t.execute}
        </button>
        <button 
          onClick={handleClearMemory}
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          {t.clear}
        </button>
      </div>

      <h3>{t.output}</h3>
      <pre style={{ backgroundColor: '#1e1e1e', color: '#39ff14', padding: '15px', fontFamily: 'monospace', minHeight: '200px', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid #333', borderRadius: '4px' }}>
        {output || 'Konzola pripravená na vstupy...'}
      </pre>
    </div>
  );
};

export default ConsolePage;