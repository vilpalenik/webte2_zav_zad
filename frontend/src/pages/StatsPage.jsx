import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatsPage = ({ t }) => {
  const typeLabel = { pendulum: t.pendulum, 'ball-beam': t.ball_beam };

  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [detail, setDetail]   = useState(null);
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
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h2>{t.stats}</h2>
      <p style={{ color: '#666' }}>{t.stats_description}</p>

      {loading && <p>{t.stats_loading}</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left' }}>
              <th style={th}>{t.stats_col_animation}</th>
              <th style={th}>{t.stats_col_count}</th>
              <th style={th}>{t.stats_col_location}</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <React.Fragment key={row.type}>
                <tr style={{ cursor: 'pointer' }} onClick={() => openDetail(row.type)}>
                  <td style={td}>{typeLabel[row.type] ?? row.type}</td>
                  <td style={td}>{row.count}</td>
                  <td style={td}>
                    {row.last_city && row.last_country
                      ? `${row.last_city}, ${row.last_country}`
                      : row.last_country ?? '—'}
                  </td>
                  <td style={{ ...td, color: '#008CBA', fontWeight: 'bold' }}>
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
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#eee' }}>
                                <th style={thSm}>{t.stats_col_datetime}</th>
                                <th style={thSm}>{t.stats_col_token}</th>
                                <th style={thSm}>{t.stats_col_city}</th>
                                <th style={thSm}>{t.stats_col_country}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.rows.map(r => (
                                <tr key={r.id}>
                                  <td style={tdSm}>{new Date(r.created_at).toLocaleString(t === 'sk' ? 'sk-SK' : 'en-GB')}</td>
                                  <td style={tdSm}><code>{r.user_token}</code></td>
                                  <td style={tdSm}>{r.city ?? '—'}</td>
                                  <td style={tdSm}>{r.country ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const th   = { padding: '12px', border: '1px solid #ddd' };
const td   = { padding: '12px', border: '1px solid #ddd' };
const thSm = { padding: '6px 10px', border: '1px solid #ddd', textAlign: 'left' };
const tdSm = { padding: '6px 10px', border: '1px solid #ddd' };

export default StatsPage;
