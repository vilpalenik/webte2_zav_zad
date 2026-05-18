import React from 'react';

const StatsPage = ({ t }) => {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>{t.stats}</h2>
      <p>Prehľad spustení jednotlivých animácií a lokalita používateľov.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left' }}>
            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Animácia</th>
            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Počet spustení</th>
            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Posledná lokalita</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '12px', border: '1px solid #ddd' }}>Inverzné kyvadlo</td>
            <td style={{ padding: '12px', border: '1px solid #ddd' }}>0</td>
            <td style={{ padding: '12px', border: '1px solid #ddd' }}>-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default StatsPage;