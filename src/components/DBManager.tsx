import React, { useState } from 'react';
import { useSqlWorker } from '../hooks/useSqlWorker';

export function DBManager({
  workerState
}: {
  workerState: ReturnType<typeof useSqlWorker>
}) {
  const { isReady, loadDatabase, execQuery, error } = workerState;
  const [databases, setDatabases] = useState<string[]>([]);
  const [query, setQuery] = useState('SELECT sqlite_version() AS version;');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = await file.arrayBuffer();
      try {
        const result = await loadDatabase(file.name, buffer);
        setDatabases(prev => [...prev, result.alias]);
      } catch (err: any) {
        alert('Failed to load DB: ' + err.message);
      }
    }
  };

  const handleExecute = async () => {
    try {
      setQueryError(null);
      const res = await execQuery(query);
      setQueryResult(res.results);
    } catch (err: any) {
      setQueryError(err.message);
      setQueryResult(null);
    }
  };

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>Failed to initialize engine: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid #ccc' }}>
      <h2>Database Manager</h2>
      {!isReady ? (
        <div>Loading SQL Engine (WASM)...</div>
      ) : (
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3>1. Attach Databases</h3>
            <div style={{ padding: '20px', border: '2px dashed #aaa', borderRadius: '8px', textAlign: 'center' }}>
              <input type="file" multiple accept=".sqlite,.db" onChange={handleFileDrop} />
            </div>
            {databases.length > 0 && (
              <ul style={{ marginTop: '10px' }}>
                {databases.map(db => (
                  <li key={db}>Attached as: <strong>{db}</strong></li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h3>2. Test Query</h3>
            <textarea
              style={{ width: '100%', height: '80px', fontFamily: 'monospace', padding: '8px' }}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button 
              onClick={handleExecute}
              style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}
            >
              Run Query
            </button>
            
            {queryError && (
              <div style={{ color: 'red', marginTop: '10px', background: '#ffebee', padding: '8px' }}>
                {queryError}
              </div>
            )}
            
            {queryResult && (
              <div style={{ marginTop: '10px', maxHeight: '200px', overflow: 'auto', background: '#f5f5f5', padding: '8px' }}>
                <pre style={{ fontSize: '12px', margin: 0 }}>
                  {JSON.stringify(queryResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}