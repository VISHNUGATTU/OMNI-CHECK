const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const LOCAL_DB_PATH = path.join(__dirname, '..', 'data', 'omni_db.json');

// Ensure data directory exists
const dataDir = path.dirname(LOCAL_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial structure for local fallback
const defaultLocalDb = {
  investigations: [],
  jobs: [],
  candidates: [],
  activityLogs: [],
  documents: []
};

function readLocalDb() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('[DB] Failed reading local_db.json, initializing fresh store:', err.message);
  }
  return { ...defaultLocalDb };
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed writing to local_db.json:', err.message);
  }
}

let isMongoConnected = false;

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('[DB] No MONGODB_URI provided. Running in resilient Local JSON Storage mode.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log('[DB] MongoDB Connected successfully.');
    return true;
  } catch (err) {
    console.warn(`[DB] MongoDB connection failed (${err.message}). Falling back to Local JSON Storage.`);
    isMongoConnected = false;
    return false;
  }
}

// Resilient collection wrapper that automatically uses MongoDB when connected or Local JSON when offline
class ResilientCollection {
  constructor(collectionName, mongooseModel) {
    this.name = collectionName;
    this.model = mongooseModel;
  }

  async find(filter = {}) {
    if (isMongoConnected && this.model) {
      try {
        return await this.model.find(filter).lean();
      } catch (e) {
        console.warn(`[DB] Mongo find error for ${this.name}: ${e.message}`);
      }
    }
    const db = readLocalDb();
    const list = db[this.name] || [];
    return list.filter(item => {
      for (const [key, val] of Object.entries(filter)) {
        if (item[key] !== val) return false;
      }
      return true;
    });
  }

  async findById(id) {
    if (isMongoConnected && this.model) {
      try {
        return await this.model.findById(id).lean();
      } catch (e) {
        console.warn(`[DB] Mongo findById error: ${e.message}`);
      }
    }
    const db = readLocalDb();
    const list = db[this.name] || [];
    return list.find(item => item._id === id || item.id === id) || null;
  }

  async create(data) {
    const record = {
      _id: data._id || data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      id: data._id || data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMongoConnected && this.model) {
      try {
        const doc = await this.model.create(record);
        return doc.toObject();
      } catch (e) {
        console.warn(`[DB] Mongo create error for ${this.name}: ${e.message}`);
      }
    }

    const db = readLocalDb();
    if (!db[this.name]) db[this.name] = [];
    db[this.name].unshift(record);
    writeLocalDb(db);
    return record;
  }

  async findByIdAndUpdate(id, updateData) {
    if (isMongoConnected && this.model) {
      try {
        return await this.model.findByIdAndUpdate(id, updateData, { new: true }).lean();
      } catch (e) {
        console.warn(`[DB] Mongo update error: ${e.message}`);
      }
    }

    const db = readLocalDb();
    const list = db[this.name] || [];
    const index = list.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    db[this.name] = list;
    writeLocalDb(db);
    return list[index];
  }

  async deleteOne(filter) {
    if (isMongoConnected && this.model) {
      try {
        await this.model.deleteOne(filter);
      } catch (e) {
        console.warn(`[DB] Mongo delete error: ${e.message}`);
      }
    }
    const db = readLocalDb();
    const list = db[this.name] || [];
    db[this.name] = list.filter(item => {
      for (const [key, val] of Object.entries(filter)) {
        if (item[key] === val) return false;
      }
      return true;
    });
    writeLocalDb(db);
    return { acknowledged: true };
  }
}

module.exports = {
  connectDB,
  ResilientCollection,
  isMongoConnected: () => isMongoConnected,
  readLocalDb,
  writeLocalDb
};

