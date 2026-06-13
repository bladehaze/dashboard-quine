import { useEffect, useRef, useState, useCallback } from 'react';
import SqlWorker from '../worker/sql-worker?worker&inline';

export function useSqlWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbacksRef = useRef<Record<string, { resolve: Function, reject: Function }>>({});

  useEffect(() => {
    const worker = new SqlWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, id, payload, error: errMsg } = e.data;
      if (type === 'ready') {
        setIsReady(true);
      } else if (type === 'error' && !id) {
        setError(errMsg);
      } else if (id && callbacksRef.current[id]) {
        if (type === 'error') {
          callbacksRef.current[id].reject(new Error(errMsg));
        } else {
          callbacksRef.current[id].resolve(payload);
        }
        delete callbacksRef.current[id];
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const loadDatabase = useCallback((name: string, buffer: ArrayBuffer) => {
    return new Promise<{ name: string, alias: string }>((resolve, reject) => {
      if (!workerRef.current) return reject(new Error('Worker not ready'));
      const id = Date.now().toString() + Math.random().toString();
      callbacksRef.current[id] = { resolve, reject };
      workerRef.current.postMessage({ type: 'load_db', id, payload: { name, buffer } });
    });
  }, []);

  const execQuery = useCallback((query: string): Promise<{ results: any[] }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject(new Error('Worker not ready'));
      const id = Date.now().toString() + Math.random().toString();
      callbacksRef.current[id] = { resolve, reject };
      workerRef.current.postMessage({ type: 'exec', id, payload: { query } });
    });
  }, []);

  return { isReady, loadDatabase, execQuery, error };
}