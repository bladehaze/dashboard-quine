import React, { useState } from 'react';
import { CoreRenderer, Widget } from './core-renderer';
import { DBManager } from './components/DBManager';
import { useSqlWorker } from './hooks/useSqlWorker';

const MOCK_WIDGETS: Widget[] = [
  {
    id: 'widget_1',
    type: 'chart',
    layout: { i: 'widget_1', x: 0, y: 0, w: 6, h: 8 },
    query: 'SELECT * FROM sales',
    config: { chartType: 'line', xAxis: 'date', yAxis: 'amount' }
  },
  {
    id: 'widget_2',
    type: 'table',
    layout: { i: 'widget_2', x: 6, y: 0, w: 6, h: 8 },
    query: 'SELECT * FROM users',
    config: {}
  }
];

const MOCK_DATA = {
  'widget_1': [{ date: '2023-01-01', amount: 100 }, { date: '2023-01-02', amount: 200 }, { date: '2023-01-03', amount: 150 }],
  'widget_2': [{ id: 1, name: 'Alice', role: 'Admin' }, { id: 2, name: 'Bob', role: 'User' }, { id: 3, name: 'Charlie', role: 'User' }]
};

function App() {
  const workerState = useSqlWorker();

  return (
    <div style={{ fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
      <header style={{ background: '#2c3e50', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>SQLite Dashboard Builder</h1>
        <div style={{ fontSize: '14px', background: workerState.isReady ? '#27ae60' : '#e67e22', padding: '4px 8px', borderRadius: '4px' }}>
          Engine: {workerState.isReady ? 'Online' : 'Booting...'}
        </div>
      </header>

      <DBManager workerState={workerState} />

      <CoreRenderer widgets={MOCK_WIDGETS} mockData={MOCK_DATA} />
    </div>
  );
}

export default App;