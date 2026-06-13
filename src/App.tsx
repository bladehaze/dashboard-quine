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
      // 1. Mutate the DOM's script tag with current state
      const stateScript = document.getElementById('dashboard-state');
      if (stateScript) {
        stateScript.textContent = JSON.stringify(widgets);
      }

      // 2. Serialize the entire HTML document
      const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

      // 3. Try File System Access API
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
        // 4. Fallback Blob download
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
          <button 
            onClick={handleSaveQuine}
            style={{ padding: '8px 16px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            title="Save workspace as a continuous HTML file"
          >
            💾 Save Workspace
          </button>
          <div style={{ fontSize: '14px', background: workerState.isReady ? '#27ae60' : '#e67e22', padding: '4px 8px', borderRadius: '4px' }}>
            Engine: {workerState.isReady ? 'Online' : 'Booting...'}
          </div>
        </div>
      </header>

      <DBManager workerState={workerState} />

      <CoreRenderer 
        widgets={widgets} 
        mockData={widgetData} 
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemoveWidget}
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