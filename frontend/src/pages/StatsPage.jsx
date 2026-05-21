import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatsPage = ({ t }) => {
  const typeLabel = { pendulum: t.pendulum, 'ball-beam': t.ball_beam };

  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [detail, setDetail]           = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/animation/stats')
      .then(res => setData(res.data.data))
      .catch(() => setError(t.stats_error))
      .finally(() => setLoading(false));
  }, [t]);

  const openDetail = async (type) => {
    if (detail?.type === type) { setDetail(null); return; }
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/animation/detail/${type}`);
      setDetail({ type, rows: res.data.data });
    } catch {
      setError(t.stats_detail_error);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>{t.stats}</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>{t.stats_description}</p>

      {loading && <p>{t.stats_loading}</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th className="cell">{t.stats_col_animation}</th>
                <th className="cell">{t.stats_col_count}</th>
                <th className="cell">{t.stats_col_location}</th>
                <th className="cell"></th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <React.Fragment key={row.type}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => openDetail(row.type)}>
                    <td className="cell">{typeLabel[row.type] ?? row.type}</td>
                    <td className="cell">{row.count}</td>
                    <td className="cell">
                      {row.last_city && row.last_country
                        ? `${row.last_city}, ${row.last_country}`
                        : row.last_country ?? '—'}
                    </td>
                    <td className="cell" style={{ color: '#008CBA', fontWeight: 'bold' }}>
                      {detail?.type === row.type ? t.stats_hide : t.stats_detail}
                    </td>
                  </tr>

                  {detail?.type === row.type && (
                    <tr>
                      <td colSpan={4} style={{ padding: 0 }}>
                        <div style={{ background: '#f9f9f9', borderTop: '1px solid #ddd', padding: '1rem' }}>
                          {detailLoading ? (
                            <p>{t.stats_loading_detail}</p>
                          ) : detail.rows.length === 0 ? (
                            <p style={{ color: '#888' }}>{t.stats_no_records}</p>
                          ) : (
                            <div className="table-responsive">
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#eee' }}>
                                    <th className="cell-sm">{t.stats_col_datetime}</th>
                                    <th className="cell-sm">{t.stats_col_token}</th>
                                    <th className="cell-sm">{t.stats_col_city}</th>
                                    <th className="cell-sm">{t.stats_col_country}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.rows.map(r => (
                                    <tr key={r.id}>
                                      <td className="cell-sm">{new Date(r.created_at).toLocaleString(t.locale)}</td>
                                      <td className="cell-sm"><code>{r.user_token.slice(0, 8)}…</code></td>
                                      <td className="cell-sm">{r.city ?? '—'}</td>
                                      <td className="cell-sm">{r.country ?? '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StatsPage;
