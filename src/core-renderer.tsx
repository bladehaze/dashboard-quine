import { ReactNode } from 'react';
import ReactGridLayout from 'react-grid-layout';

// Basic mock types for Phase 1
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
  config: Record<string, any>;
}

interface CoreRendererProps {
  widgets: Widget[];
  mockData: Record<string, any[]>;
}

const GridLayout = ReactGridLayout as any;

export function CoreRenderer({ widgets, mockData }: CoreRendererProps): ReactNode {
  const layouts = widgets.map((w) => w.layout);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '20px' }}>
      <GridLayout
        className="layout"
        layout={layouts}
        cols={12}
        rowHeight={30}
        width={1200}
        draggableHandle=".drag-handle"
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
                  fontWeight: 'bold'
                }}
              >
                {widget.id} ({widget.type})
              </div>
              <div style={{ padding: '10px', flex: 1, overflow: 'auto' }}>
                <pre style={{ fontSize: '10px' }}>{JSON.stringify(data, null, 2)}</pre>
              </div>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}