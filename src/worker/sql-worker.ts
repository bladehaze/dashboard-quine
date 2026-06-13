import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let SQL: any = null;
let db: any = null;
let dbNames: string[] = [];

async function init() {
  try {
    const response = await fetch(wasmUrl);
    const wasmBinary = await response.arrayBuffer();
    SQL = await initSqlJs({ wasmBinary });
    db = new SQL.Database();
    postMessage({ type: 'ready' });
  } catch (e: any) {
    postMessage({ type: 'error', error: e.message });
  }
}

init();

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  if (type === 'load_db') {
    const { name, buffer } = payload;
    try {
      if (!SQL) throw new Error('SQL.js not initialized yet');
      
      SQL.FS.createDataFile('/', name, new Uint8Array(buffer), true, true);
      
      const dbAlias = name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      db.run(`ATTACH DATABASE '/${name}' AS ${dbAlias}`);
      dbNames.push(dbAlias);
      
      postMessage({ type: 'load_db_success', id, payload: { name, alias: dbAlias } });
    } catch (error: any) {
      postMessage({ type: 'error', id, error: error.message });
    }
  } else if (type === 'exec') {
    const { query } = payload;
    try {
      if (!db) throw new Error('Database not initialized');
      const results = db.exec(query);
      
      let formattedResults: any[] = [];
      if (results.length > 0) {
        const columns = results[0].columns;
        const values = results[0].values;
        formattedResults = values.map((row: any[]) => {
          const obj: any = {};
          columns.forEach((col: string, i: number) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      
      postMessage({ type: 'exec_success', id, payload: { results: formattedResults } });
    } catch (error: any) {
      postMessage({ type: 'error', id, error: error.message });
    }
  }
};