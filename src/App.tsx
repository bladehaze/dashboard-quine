import React, { useState, useEffect } from 'react';
import { CoreRenderer, Widget, LayoutItem } from './core-renderer';
import { DBManager } from './components/DBManager';
import { BuilderModal } from './components/BuilderModal';
import { useSqlWorker } from './hooks/useSqlWorker';

function App() {
  const workerState = useSqlWorker();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetData, setWidgetData] = useState<Record<string, any[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [fileHandle, setFileHandle] = useState<any>(null);

  // Rehydrate state on boot
  useEffect(() => {
    try {
      const stateScript = document.getElementById('dashboard-state');
      if (stateScript && stateScript.textContent) {
        const loadedWidgets = JSON.parse(stateScript.textContent);
        if (Array.isArray(loadedWidgets) && loadedWidgets.length > 0) {
          setWidgets(loadedWidgets);
        }
      }
    } catch (e) {
      console.error("Failed to parse initial dashboard state", e);
    }
  }, []);

  // Re-run queries for all widgets when db or widgets change
  useEffect(() => {
    if (!workerState.isReady) return;
    
    widgets.forEach(async (widget) => {
      try {
        const res = await workerState.execQuery(widget.query);
        setWidgetData(prev => ({ ...prev, [widget.id]: res.results }));
      } catch (e) {
        console.error(`Failed to load data for widget ${widget.id}`, e);
      }
    });
  }, [widgets, workerState.isReady]);

  const handleAddWidget = (widget: Widget) => {
    setWidgets([...widgets, widget]);
    setShowModal(false);
  };

  const handleLayoutChange = (layout: LayoutItem[]) => {
    setWidgets(prev => prev.map(w => {
      const updatedLayout = layout.find(l => l.i === w.id);
      if (updatedLayout) {
        return { ...w, layout: updatedLayout };
      }
      return w;
    }));
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    setWidgetData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSaveQuine = async () => {
    try {
      const stateScript = document.getElementById('dashboard-state');
      if (stateScript) {
        stateScript.textContent = JSON.stringify(widgets);
      }

      const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

      if ('showSaveFilePicker' in window) {
        let handle = fileHandle;
        if (!handle) {
          handle = await (window as any).showSaveFilePicker({
            suggestedName: 'dashboard.html',
            types: [{
              description: 'HTML Document',
              accept: { 'text/html': ['.html'] },
            }],
          });
          setFileHandle(handle);
        }
        const writable = await handle.createWritable();
        await writable.write(htmlContent);
        await writable.close();
        alert('Workspace saved successfully!');
      } else {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard.html';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert('Failed to save: ' + err.message);
      }
    }
  };

  const handleExportSnapshot = () => {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    
    const dataScript = document.createElement('script');
    dataScript.id = 'dashboard-static-data';
    dataScript.type = 'application/json';
    dataScript.textContent = JSON.stringify(widgetData);
    clone.querySelector('head')?.appendChild(dataScript);
    
    const stateScript = clone.querySelector('#dashboard-state');
    if (stateScript) {
      stateScript.textContent = JSON.stringify(widgets);
    }
    
    const modeScript = document.createElement('script');
    modeScript.textContent = 'window.__DASHBOARD_READONLY__ = true;';
    clone.querySelector('head')?.appendChild(modeScript);

    const htmlContent = '<!DOCTYPE html>\n' + clone.outerHTML;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_snapshot.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCLI = () => {
    const stateScript = document.getElementById('dashboard-state');
    const widgetsJson = stateScript ? stateScript.textContent : '[]';
    
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    const cleanState = clone.querySelector('#dashboard-state');
    if (cleanState) cleanState.textContent = '[]';
    
    // Create base64 of HTML instead of string literal to avoid escaping bugs with complex bundles
    const htmlB64 = btoa(encodeURIComponent('<!DOCTYPE html>\n' + clone.outerHTML));

    const cliScript = `
const fs = require('fs');
const Database = require('better-sqlite3');

const argv = process.argv.slice(2);
const dbPaths = {};
let outPath = 'final_dashboard.html';

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--db' && argv[i+1]) {
    const [alias, path] = argv[i+1].split('=');
    dbPaths[alias] = path;
    i++;
  } else if (argv[i] === '--out' && argv[i+1]) {
    outPath = argv[i+1];
    i++;
  }
}

const widgets = JSON.parse(decodeURIComponent(atob("${btoa(encodeURIComponent(widgetsJson || '[]'))}")));
const widgetData = {};

if (Object.keys(dbPaths).length > 0) {
  const mainAlias = Object.keys(dbPaths)[0];
  const db = new Database(dbPaths[mainAlias], { readonly: true });
  
  for (const [alias, path] of Object.entries(dbPaths)) {
    if (alias !== mainAlias) {
      db.exec(\`ATTACH DATABASE '\${path}' AS \${alias}\`);
    }
  }

  for (const widget of widgets) {
    try {
      const stmt = db.prepare(widget.query);
      widgetData[widget.id] = stmt.all();
    } catch (e) {
      console.error(\`Failed query for \${widget.id}: \`, e.message);
      widgetData[widget.id] = [];
    }
  }
  db.close();
}

let htmlTemplate = decodeURIComponent(atob("${htmlB64}"));

htmlTemplate = htmlTemplate.replace(
  '<script id="dashboard-state" type="application/json">[]</script>',
  \`<script id="dashboard-state" type="application/json">\${JSON.stringify(widgets)}</script>\`
);

const injection = \`
<script id="dashboard-static-data" type="application/json">\${JSON.stringify(widgetData)}</script>
<script>window.__DASHBOARD_READONLY__ = true;</script>
\`;

htmlTemplate = htmlTemplate.replace('</head>', injection + '</head>');

fs.writeFileSync(outPath, htmlTemplate);
console.log('Dashboard generated: ' + outPath);
`;

    const blob = new Blob([cliScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'update_dashboard.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
      <header style={{ background: '#2c3e50', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>SQLite Dashboard Builder</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Add Panel
          </button>
          
          <div style={{ width: '1px', background: '#7f8c8d', height: '24px', margin: '0 5px' }} />
          
          <button 
            onClick={handleSaveQuine}
            style={{ padding: '8px 16px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            title="Save workspace as a continuous HTML file"
          >
            💾 Save Workspace
          </button>
          
          <button 
            onClick={handleExportSnapshot}
            style={{ padding: '8px 16px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📤 Export Snapshot
          </button>
          
          <button 
            onClick={handleExportCLI}
            style={{ padding: '8px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🤖 Export CLI Script
          </button>

          <div style={{ fontSize: '14px', background: workerState.isReady ? '#27ae60' : '#e67e22', padding: '4px 8px', borderRadius: '4px', marginLeft: '10px' }}>
            Engine: {workerState.isReady ? 'Online' : 'Booting...'}
          </div>
        </div>
      </header>

      {!(window as any).__DASHBOARD_READONLY__ && (
        <DBManager workerState={workerState} />
      )}

      <CoreRenderer 
        widgets={widgets} 
        mockData={(window as any).__DASHBOARD_READONLY__ ? JSON.parse(document.getElementById('dashboard-static-data')?.textContent || '{}') : widgetData} 
        onLayoutChange={!(window as any).__DASHBOARD_READONLY__ ? handleLayoutChange : undefined}
        onRemoveWidget={!(window as any).__DASHBOARD_READONLY__ ? handleRemoveWidget : undefined}
      />

      {showModal && (
        <BuilderModal 
          onClose={() => setShowModal(false)}
          onSave={handleAddWidget}
          workerState={workerState}
        />
      )}
    </div>
  );
}

export default App;