// Production start wrapper - runs drizzle-kit push if needed, then loads server
const http = require('http');
const pg = require('pg');
const { execSync } = require('child_process');

async function getTableCount() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return -1;
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });
  try {
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    await pool.end();
    return tables.rows.length;
  } catch (err) {
    console.error('DB check failed:', err.message);
    await pool.end().catch(() => {});
    return -1;
  }
}

async function main() {
  process.on('unhandledRejection', (r) => console.error('Unhandled rejection:', r));
  process.on('uncaughtException', (e) => console.error('Uncaught exception:', e));

  const count = await getTableCount();

  if (count === 0) {
    console.log('No tables found, running drizzle-kit push...');
    try {
      const out = execSync('npx drizzle-kit push 2>&1', {
        cwd: process.cwd(), encoding: 'utf-8', timeout: 60000,
        env: { ...process.env },
      });
      console.log(out);
    } catch (err) {
      console.error('drizzle-kit push failed:', err.message);
    }
  } else {
    console.log(`Found ${count} tables, skipping push`);
  }

  console.log('Starting server...');
  try {
    require('./server_dist/index.cjs');
  } catch (err) {
    console.error('Server failed to start:', err.message);
    const port = process.env.PORT || 10000;
    http.createServer((_, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server failed to start' }));
    }).listen(port, '0.0.0.0');
  }
}

main();

