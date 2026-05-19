import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EditorModule from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-matlab';
import 'prismjs/themes/prism-tomorrow.css';

const Editor = EditorModule.default || EditorModule;

const apiHeaders = {
  'X-API-KEY': import.meta.env.VITE_API_KEY,
  'Content-Type': 'application/json',
};

const ConsolePage = ({ t }) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    let sId = sessionStorage.getItem('cas_session_id');
    if (!sId) {
      sId = 'sess_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('cas_session_id', sId);
    }
    setSessionId(sId);
  }, []);

  const handleExecute = async () => {
    if (!command.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post('/api/cas/execute', {
        command,
        session_id: sessionId,
      }, { headers: apiHeaders });
      setOutput(prev => prev + `\n>> ${command}\n${response.data.output}`);
      setCommand('');
    } catch (error) {
      const errorOutput = error.response?.data?.output || error.response?.data?.message || t.connection_error;
      setOutput(prev => prev + `\n>> ${command}\n[${t.error}]: ${errorOutput}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearMemory = async () => {
    try {
      await axios.post('/api/cas/clear', { session_id: sessionId }, { headers: apiHeaders });
      setOutput(prev => prev + `\n\n[${t.system}]: ${t.memory_cleared}`);
    } catch {
      alert(t.clear_error);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const response = await fetch('/api/cas/export', { headers: { 'X-API-KEY': import.meta.env.VITE_API_KEY } });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cas_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(t.export_error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t.console}</h2>
        <button
          onClick={handleDownloadCsv}
          style={{ padding: '8px 15px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {t.export_csv}
        </button>
      </div>

      <p style={{ fontSize: '0.9rem', color: '#666' }}>{t.session_id}: <code>{sessionId}</code></p>

      <div style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px', minHeight: '120px', backgroundColor: '#2d2d2d' }}>
        <Editor
          value={command}
          onValueChange={code => setCommand(code)}
          highlight={code => Prism.highlight(code, Prism.languages.matlab, 'matlab')}
          padding={15}
          placeholder={t.placeholder}
          style={{ fontFamily: '"Fira code", "Fira Mono", monospace', fontSize: 16, minHeight: '120px', color: '#ccc' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={handleExecute}
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          {loading ? t.computing : t.execute}
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
        {output || t.console_ready}
      </pre>
    </div>
  );
};

export default ConsolePage;
