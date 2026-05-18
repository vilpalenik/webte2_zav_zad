import React, { useState, useEffect } from 'react';
import axios from 'axios';

const METHOD_COLORS = { get: '#61affe', post: '#49cc90', put: '#fca130', delete: '#f93e3e' };

const DocsPage = ({ t }) => {
  const [spec, setSpec] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/docs/openapi')
      .then(res => setSpec(res.data))
      .catch(() => setError('Nepodarilo sa načítať dokumentáciu.'));
  }, []);

  const handleDownloadPdf = () => {
    window.open('/api/docs/print', '_blank');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>{t.docs}</h2>
        <button onClick={handleDownloadPdf}
          style={{ padding: '8px 18px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
          Stiahnuť PDF
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!spec && !error && <p>Načítavam...</p>}

      {spec && (
        <>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            <strong>Verzia:</strong> {spec.info.version} &nbsp;|&nbsp;
            <strong>Autentifikácia:</strong> header <code>X-API-KEY</code>
          </p>

          {Object.entries(spec.paths).map(([path, methods]) =>
            Object.entries(methods).map(([method, def]) => (
              <div key={`${method}${path}`} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '.5rem' }}>
                  <span style={{ backgroundColor: METHOD_COLORS[method] ?? '#aaa', color: 'white', padding: '2px 10px', borderRadius: 4, fontSize: '.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {method}
                  </span>
                  <code style={{ fontSize: '1rem', fontWeight: 'bold' }}>{path}</code>
                </div>
                <p style={{ margin: '0 0 .5rem', fontWeight: 'bold' }}>{def.summary}</p>
                <p style={{ margin: '0 0 .75rem', color: '#555', fontSize: '.9rem' }}>{def.description}</p>

                {def.requestBody && (() => {
                  const schema = def.requestBody.content?.['application/json']?.schema;
                  const props  = schema?.properties ?? {};
                  const req    = schema?.required ?? [];
                  if (!Object.keys(props).length) return null;
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                          <th style={th}>Parameter</th><th style={th}>Typ</th><th style={th}>Popis</th><th style={th}>Povinný</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(props).map(([name, p]) => (
                          <tr key={name}>
                            <td style={td}><code>{name}</code></td>
                            <td style={td}>{p.enum ? p.enum.join(' | ') : p.type}</td>
                            <td style={td}>{p.description ?? '—'}</td>
                            <td style={td}>{req.includes(name) ? '✓' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};

const th = { padding: '6px 10px', border: '1px solid #ddd', textAlign: 'left' };
const td = { padding: '6px 10px', border: '1px solid #ddd' };

export default DocsPage;
