const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Testing CLI Automation Script ---');

// 1. Create a dummy sqlite database
const dbPath = path.resolve(__dirname, 'dummy.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = new Database(dbPath);
db.exec('CREATE TABLE test (x TEXT, y INTEGER);');
db.exec("INSERT INTO test VALUES ('A', 10), ('B', 20);");
db.close();

const indexPath = path.resolve(__dirname, '../dist/index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

const widgetsJson = JSON.stringify([
  {
    id: 'test_widget_cli',
    type: 'table',
    layout: { i: 'test_widget_cli', x: 0, y: 0, w: 6, h: 8 },
    query: 'SELECT * FROM test',
    config: {}
  }
]);

const htmlB64 = Buffer.from(encodeURIComponent(indexHtml)).toString('base64');
const widgetsB64 = Buffer.from(encodeURIComponent(widgetsJson)).toString('base64');

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

const widgets = JSON.parse(decodeURIComponent(Buffer.from("${widgetsB64}", 'base64').toString('utf-8')));
const widgetData = {};

if (Object.keys(dbPaths).length > 0) {
  const mainAlias = Object.keys(dbPaths)[0];
  const db = new Database(dbPaths[mainAlias], { readonly: true });
  
  for (const widget of widgets) {
    try {
      const stmt = db.prepare(widget.query);
      widgetData[widget.id] = stmt.all();
    } catch (e) {
      console.error("Failed query: " + e.message);
      widgetData[widget.id] = [];
    }
  }
  db.close();
}

let htmlTemplate = decodeURIComponent(Buffer.from("${htmlB64}", 'base64').toString('utf-8'));

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

const scriptPath = path.resolve(__dirname, 'update_dashboard.js');
const outHtmlPath = path.resolve(__dirname, 'snapshot.html');

fs.writeFileSync(scriptPath, cliScript);

console.log('Executing generated CLI script...');
execSync(`node ${scriptPath} --db main=${dbPath} --out ${outHtmlPath}`);

const outHtml = fs.readFileSync(outHtmlPath, 'utf-8');
if (outHtml.includes('__DASHBOARD_READONLY__ = true') && outHtml.includes('"x":"A","y":10')) {
  console.log('✅ CLI Export Test Passed! Snapshot contains the correct queried data.');
} else {
  console.error('❌ CLI Export Test Failed! Snapshot missing expected data.');
  process.exit(1);
}

fs.unlinkSync(dbPath);
fs.unlinkSync(scriptPath);
fs.unlinkSync(outHtmlPath);