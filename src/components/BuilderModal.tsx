import React, { useState, useEffect } from 'react';
import { Widget } from '../core-renderer';
import { useSqlWorker } from '../hooks/useSqlWorker';

interface BuilderModalProps {
  onClose: () => void;
  onSave: (widget: Widget) => void;
  workerState: ReturnType<typeof useSqlWorker>;
}

export function BuilderModal({ onClose, onSave, workerState }: BuilderModalProps) {
  const [type, setType] = useState<'chart' | 'table'>('table');
  const [query, setQuery] = useState('');
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter' | 'pie'>('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');

  const handlePreview = async () => {
    try {
      setError(null);
      const res = await workerState.execQuery(query);
      setPreviewData(res.results);
      if (res.results.length > 0) {
        const cols = Object.keys(res.results[0]);
        if (!xAxis && cols.length > 0) setXAxis(cols[0]);
        if (!yAxis && cols.length > 1) setYAxis(cols[1]);
      }
    } catch (err: any) {
      setError(err.message);
      setPreviewData(null);
    }
  };

  const handleSave = () => {
    const newWidget: Widget = {
      id: 'widget_' + Date.now(),
      type,
      layout: { i: 'widget_' + Date.now(), x: 0, y: Infinity, w: 6, h: 8 },
      query,
      config: type === 'chart' ? { chartType, xAxis, yAxis } : {}
    };
    onSave(newWidget);
  };

  const columns = previewData && previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
        <h2>Add Widget</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Type: </label>
          <select value={type} onChange={e => setType(e.target.value as 'chart' | 'table')}>
            <option value="table">Table</option>
            <option value="chart">Chart</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>SQL Query:</label><br/>
          <textarea 
            style={{ width: '100%', height: '100px', fontFamily: 'monospace' }}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={handlePreview} style={{ marginTop: '5px' }}>Preview Data</button>
        </div>

        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

        {previewData && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Preview ({previewData.length} rows)</strong>
            <div style={{ maxHeight: '150px', overflow: 'auto', background: '#eee', padding: '5px' }}>
              <pre style={{ fontSize: '12px', margin: 0 }}>{JSON.stringify(previewData.slice(0, 5), null, 2)}</pre>
            </div>
          </div>
        )}

        {type === 'chart' && previewData && columns.length > 0 && (
          <div style={{ marginBottom: '15px', padding: '10px', background: '#f9f9f9', border: '1px solid #ddd' }}>
            <h3>Chart Config</h3>
            <div>
              <label>Chart Type: </label>
              <select value={chartType} onChange={e => setChartType(e.target.value as any)}>
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="scatter">Scatter</option>
                <option value="pie">Pie</option>
              </select>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label>X-Axis Column: </label>
              <select value={xAxis} onChange={e => setXAxis(e.target.value)}>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label>Y-Axis Column: </label>
              <select value={yAxis} onChange={e => setYAxis(e.target.value)}>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={!previewData}>Add to Dashboard</button>
        </div>
      </div>
    </div>
  );
}