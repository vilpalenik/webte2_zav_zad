import React, { useState, useEffect } from 'react';
import axios from 'axios';

const METHOD_COLORS = { get: '#61affe', post: '#49cc90', put: '#fca130', delete: '#f93e3e' };

const th = { padding: '6px 10px', border: '1px solid #ddd', textAlign: 'left' };
const td = { padding: '6px 10px', border: '1px solid #ddd' };

const DocsPage = ({ t }) => {
  const [spec, setSpec] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`/api/docs/openapi?lang=${t.lang}`)
      .then(res => setSpec(res.data))
      .catch(() => setError(t.docs_error));
  }, [t]);

  const handleDownloadPdf = () => {
    window.location.href = `/api/docs/pdf?lang=${t.lang}`;
  };

  return (
    <div className="page" style={{ maxWidth: '860px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>{t.docs}</h2>
        <button className="btn btn-blue" onClick={handleDownloadPdf}>{t.docs_download}</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!spec && !error && <p>{t.docs_loading}</p>}

      {spec && (
        <>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            <strong>{t.docs_version}:</strong> {spec.info.version} &nbsp;|&nbsp;
            <strong>{t.docs_auth}:</strong> header <code>X-API-KEY</code>
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
                    <div className="table-responsive">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem', minWidth: 400 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={th}>{t.docs_col_parameter}</th><th style={th}>{t.docs_col_type}</th><th style={th}>{t.docs_col_description}</th><th style={th}>{t.docs_col_required}</th>
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
                    </div>
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


export default DocsPage;
