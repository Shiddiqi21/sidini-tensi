const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on('error', (err) => { console.error('Browser ERROR:', err); });
virtualConsole.on('warn', (warn) => { console.warn('Browser WARN:', warn); });
virtualConsole.on('info', (info) => { console.info('Browser INFO:', info); });
virtualConsole.on('log', (log) => { console.log('Browser LOG:', log); });
virtualConsole.on('jsdomError', (err) => { console.error('JSDOM ERROR:', err.message, err.detail); });

const dom = new JSDOM(html, { 
  runScripts: 'dangerously', 
  resources: 'usable',
  virtualConsole
});
