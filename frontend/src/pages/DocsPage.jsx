import React from 'react';

const DocsPage = ({ t }) => {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>{t.docs}</h2>
      <button style={{ padding: '10px 20px', backgroundColor: '#008CBA', color: 'white', border: 'none', cursor: 'pointer', marginBottom: '20px' }}>
        Stiahnuť dokumentáciu (PDF)
      </button>
      <div style={{ border: '1px solid #ddd', padding: '20px', backgroundColor: '#fafafa' }}>
        <h3>OpenAPI Špecifikácia</h3>
        <p>Tu bude vykreslené Swagger UI alebo textový popis endpointov.</p>
      </div>
    </div>
  );
};

export default DocsPage;