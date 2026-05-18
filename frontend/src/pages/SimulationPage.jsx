import React from 'react';

const SimulationPage = ({ title, t }) => {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Miesto pre animáciu */}
        <div style={{ border: '2px dashed #ccc', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
          <strong>[ Tu bude 2D/3D Animácia ]</strong>
        </div>
        {/* Miesto pre graf */}
        <div style={{ border: '2px dashed #ccc', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
          <strong>[ Tu bude Synchrónny Graf ]</strong>
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;