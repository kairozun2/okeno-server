// Diagnostic start wrapper - tests DB connection then loads main server
const http = require('http');
const pg = require('pg');

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
    
    // Check if tables exist
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    global.__diagnostics.tables = tables.rows.map(r => r.tablename);
    console.log('Tables found:', global.__diagnostics.tables.length, global.__diagnostics.tables.join(', '));
    
    await pool.end();
    return true;
  } catch (err) {
    console.error('DB CONNECTION FAILED:', err.message);
    global.__diagnostics.dbConnected = false;
    global.__diagnostics.dbError = err.message;
    await pool.end().catch(() => {});
    return false;
  }
}

testDB().then(ok => {
  console.log('DB test result:', ok);
  
  // Set up process error handlers
  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });
  
  try {
    // Load main server - it will bind to PORT
    require('./server_dist/index.cjs');
  } catch (err) {
    console.error('SERVER LOAD ERROR:', err);
    http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server load error', details: err.message, diagnostics: global.__diagnostics }));
    }).listen(10000, '0.0.0.0');
  }
});

