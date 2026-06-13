import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export interface ChartConfig {
  chartType: 'line' | 'bar' | 'scatter' | 'pie';
  xAxis: string;
  yAxis: string;
}

export function ChartWidget({ data, config }: { data: any[], config: ChartConfig }) {
  const chartRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;
    const chart = echarts.init(chartRef.current);
    
    // Simple ECharts adapter logic
    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: { 
        type: 'category', 
        data: data.map(d => d[config.xAxis]) 
      },
      yAxis: { type: 'value' },
      series: [{
        data: data.map(d => d[config.yAxis]),
        type: config.chartType || 'bar'
      }],
      grid: { left: '10%', right: '10%', bottom: '15%', top: '10%' }
    };
    
    chart.setOption(option);
    
    // Resize observer to auto-fit React-Grid-Layout
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);
    
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data, config]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '150px' }} />;
}