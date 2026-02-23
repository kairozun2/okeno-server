// Production start wrapper - runs drizzle-kit push then loads server
const http = require('http');
const pg = require('pg');
const { execSync } = require('child_process');

// Store diagnostics globally
global.__diagnostics = {};

async function testDB() {
  const dbUrl = process.env.DATABASE_URL;
  global.__diagnostics.dbUrlSet = !!dbUrl;
  global.__diagnostics.dbUrlPrefix = dbUrl ? dbUrl.substring(0, 40) + '...' : 'NOT SET';
  
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl && dbUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const result = await pool.query('SELECT current_database() as db, current_user as user_name');
    console.log('DB CONNECTION OK:', result.rows[0]);
    global.__diagnostics.dbConnected = true;
    global.__diagnostics.dbInfo = result.rows[0];
    
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    global.__diagnostics.tables = tables.rows.map(r => r.tablename);
    console.log('Tables found:', global.__diagnostics.tables.length);
    
    await pool.end();
    return global.__diagnostics.tables.length;
  } catch (err) {
    console.error('DB CONNECTION FAILED:', err.message);
    global.__diagnostics.dbConnected = false;
    global.__diagnostics.dbError = err.message;
    await pool.end().catch(() => {});
    return -1;
  }
}

async function main() {
  // Set up process error handlers
  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });

  const tableCount = await testDB();
  
  if (tableCount === 0) {
    console.log('No tables found, running drizzle-kit push...');
    try {
      // Use the current DATABASE_URL (internal) since we already confirmed it works
      const output = execSync(`npx drizzle-kit push 2>&1`, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 60000,
        env: { ...process.env },
      });
      console.log('drizzle-kit push output:', output);
      global.__diagnostics.pushResult = 'success';
      global.__diagnostics.pushOutput = output.substring(0, 500);
    } catch (err) {
      console.error('drizzle-kit push failed:', err.message);
      if (err.stdout) console.log('stdout:', err.stdout);
      if (err.stderr) console.error('stderr:', err.stderr);
      global.__diagnostics.pushResult = 'failed: ' + err.message;
      global.__diagnostics.pushStdout = err.stdout ? err.stdout.substring(0, 500) : '';
      global.__diagnostics.pushStderr = err.stderr ? err.stderr.substring(0, 500) : '';
    }
    
    // Re-check tables
    const newCount = await testDB();
    console.log('Tables after push:', newCount);
  } else if (tableCount > 0) {
    console.log(`Found ${tableCount} tables, skipping drizzle-kit push`);
  }
  
  console.log('Loading main server...');
  try {
    require('./server_dist/index.cjs');
  } catch (err) {
    console.error('SERVER LOAD ERROR:', err);
    http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server load error', details: err.message, diagnostics: global.__diagnostics }));
    }).listen(10000, '0.0.0.0');
  }
}

main();

