import React from 'react';
import { CoreRenderer, Widget } from './core-renderer';

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
  'widget_1': [{ date: '2023-01-01', amount: 100 }, { date: '2023-01-02', amount: 200 }],
  'widget_2': [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
};

function App() {
  return (
    <div>
      <h1 style={{ paddingLeft: '20px' }}>SQLite Dashboard Builder (Phase 1.1 Setup)</h1>
      <CoreRenderer widgets={MOCK_WIDGETS} mockData={MOCK_DATA} />
    </div>
  );
}

export default App;