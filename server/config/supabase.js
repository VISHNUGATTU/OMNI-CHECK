const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

let client = null;

// 1. Try Live Supabase Client if credentials are provided
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        fetch: fetch
      }
    });
    console.log('[Supabase] Initialized with remote Supabase cloud credentials.');
  } catch (err) {
    console.warn('[Supabase] Remote connection init failed, activating local fallback:', err.message);
    client = null;
  }
}

// 2. Resilient Local Database Fallback (Pure MERN operation without Supabase)
if (!client) {
  console.log('[Supabase] No remote SUPABASE_URL/KEY configured. Operating in 100% Local JSON/MERN mode (data/local_db.json).');
  
  const LOCAL_DB_PATH = path.join(__dirname, '..', 'data', 'local_db.json');

  function readData() {
    try {
      if (fs.existsSync(LOCAL_DB_PATH)) {
        return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
      }
    } catch (e) {
      console.warn('Error reading local_db.json:', e.message);
    }
    return { employees: [], assessments: [] };
  }

  function writeData(data) {
    try {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing local_db.json:', e.message);
    }
  }

  class MockQueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.filters = [];
      this.isSingle = false;
      this.orderCol = null;
      this.orderAsc = true;
    }

    select(cols = '*') {
      return this;
    }

    eq(field, val) {
      this.filters.push({ field, val });
      return this;
    }

    order(col, options = {}) {
      this.orderCol = col;
      this.orderAsc = options?.ascending !== false;
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    async then(resolve, reject) {
      try {
        const db = readData();
        let rows = [...(db[this.tableName] || [])];
        for (const f of this.filters) {
          rows = rows.filter(r => String(r[f.field]) === String(f.val));
        }
        if (this.orderCol) {
          rows.sort((a, b) => {
            if (a[this.orderCol] < b[this.orderCol]) return this.orderAsc ? -1 : 1;
            if (a[this.orderCol] > b[this.orderCol]) return this.orderAsc ? 1 : -1;
            return 0;
          });
        }
        const data = this.isSingle ? (rows[0] || null) : rows;
        resolve({ data, error: null });
      } catch (err) {
        resolve({ data: null, error: err });
      }
    }

    async upsert(records, options = {}) {
      const db = readData();
      if (!db[this.tableName]) db[this.tableName] = [];
      const list = Array.isArray(records) ? records : [records];
      const conflictKey = options?.onConflict || 'id';

      for (const rec of list) {
        const idx = db[this.tableName].findIndex(r => r[conflictKey] === rec[conflictKey]);
        if (idx >= 0) {
          db[this.tableName][idx] = { ...db[this.tableName][idx], ...rec };
        } else {
          db[this.tableName].push(rec);
        }
      }
      writeData(db);
      return { data: records, error: null };
    }

    async insert(records) {
      return this.upsert(records);
    }

    async update(updateData) {
      const db = readData();
      if (!db[this.tableName]) db[this.tableName] = [];
      let updatedRows = [];
      db[this.tableName] = db[this.tableName].map(row => {
        let match = true;
        for (const f of this.filters) {
          if (String(row[f.field]) !== String(f.val)) match = false;
        }
        if (match) {
          const merged = { ...row, ...updateData };
          updatedRows.push(merged);
          return merged;
        }
        return row;
      });
      writeData(db);
      return { data: updatedRows, error: null };
    }
  }

  client = {
    from: (tableName) => new MockQueryBuilder(tableName)
  };
}

module.exports = client;
