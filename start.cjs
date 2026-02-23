// Diagnostic start wrapper - tests DB connection then loads main server
const http = require('http');
const pg = require('pg');

async function testDB() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('DB URL (truncated):', dbUrl ? dbUrl.substring(0, 30) + '...' : 'NOT SET');
  
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const result = await pool.query('SELECT current_database() as db, current_user as user_name');
    console.log('DB CONNECTION OK:', result.rows[0]);
    
    // Check if tables exist
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('Tables:', tables.rows.map(r => r.tablename).join(', '));
    
    await pool.end();
    return { ok: true, info: result.rows[0], tables: tables.rows.map(r => r.tablename) };
  } catch (err) {
    console.error('DB CONNECTION FAILED:', err.message);
    await pool.end().catch(() => {});
    return { ok: false, error: err.message };
  }
}

testDB().then(dbResult => {
  if (dbResult.ok) {
    console.log('Loading main server...');
    try {
      require('./server_dist/index.cjs');
    } catch (err) {
      console.error('SERVER LOAD ERROR:', err.message);
      http.createServer((req, res) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server load error', details: err.message }));
      }).listen(10000, '0.0.0.0');
    }
  } else {
    console.log('Starting error server...');
    http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DB connection failed', details: dbResult.error, dbUrl: process.env.DATABASE_URL ? 'set' : 'NOT SET' }));
    }).listen(10000, '0.0.0.0', () => {
      console.log('Error server on port 10000');
    });
  }
});

