import { ReactNode } from 'react';
import GridLayout from 'react-grid-layout';
import { ChartWidget, ChartConfig } from './components/ChartWidget';
import { TableWidget } from './components/TableWidget';

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

export interface Widget {
  id: string;
  type: 'chart' | 'table';
  layout: LayoutItem;
  query: string;
  config: ChartConfig | Record<string, any>;
}

interface CoreRendererProps {
  widgets: Widget[];
  mockData: Record<string, any[]>;
  onLayoutChange?: (layout: LayoutItem[]) => void;
  onRemoveWidget?: (id: string) => void;
}

const ResponsiveGridLayout = GridLayout as any;

export function CoreRenderer({ widgets, mockData, onLayoutChange, onRemoveWidget }: CoreRendererProps): ReactNode {
  const layouts = widgets.map((w) => w.layout);

  const renderWidgetContent = (widget: Widget, data: any[]) => {
    if (widget.type === 'chart') {
      return <ChartWidget data={data} config={widget.config as ChartConfig} />;
    } else if (widget.type === 'table') {
      return <TableWidget data={data} />;
    }
    return null;
  };

  if (widgets.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
        <h3>No widgets yet</h3>
        <p>Drop a SQLite file above, then click "+ Add Panel" to build your dashboard.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 200px)', padding: '20px' }}>
      <ResponsiveGridLayout
        className="layout"
        layout={layouts}
        cols={12}
        rowHeight={30}
        width={1200}
        draggableHandle=".drag-handle"
        onLayoutChange={onLayoutChange}
      >
        {widgets.map((widget) => {
          const data = mockData[widget.id] || [];
          return (
            <div
              key={widget.id}
              style={{
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div
                className="drag-handle"
                style={{
                  background: '#eee',
                  padding: '5px 10px',
                  cursor: 'grab',
                  borderBottom: '1px solid #ccc',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{widget.type.toUpperCase()}</span>
                {onRemoveWidget && (
                  <button 
                    onClick={() => onRemoveWidget(widget.id)}
                    style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    X
                  </button>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {renderWidgetContent(widget, data)}
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}