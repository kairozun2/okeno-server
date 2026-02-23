// Production start wrapper that catches and exposes startup errors
const http = require('http');

function startErrorServer(err) {
  console.error('STARTUP ERROR:', err);
  http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Startup Error:\n\n' + (err.stack || String(err)));
  }).listen(10000, '0.0.0.0', () => {
    console.log('Fallback error server running on port 10000');
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

try {
  require('./server_dist/index.cjs');
} catch (err) {
  startErrorServer(err);
}
