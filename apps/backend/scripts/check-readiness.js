import { MongoClient } from 'mongodb';

const mongoUri =
  process.env.MONGO_URL ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/indexflow';
const mongoDbName = process.env.MONGO_DB ?? 'indexflow';
const apiBase =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '') || 'http://localhost:4000/api';

const failures = [];

const logOk = (message) => console.log(`✅ ${message}`);
const logFail = (message, error) => {
  console.error(`❌ ${message}${error ? ` -> ${error instanceof Error ? error.message : error}` : ''}`);
  failures.push(message);
};

const checkMongoAndData = async () => {
  let client;

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    logOk(`MongoDB reachable (${mongoUri})`);

    const db = client.db(mongoDbName);
    const transfers = db.collection('transfers');

    const count = await transfers.countDocuments({ chain: 'sepolia' });
    if (count > 0) {
      logOk(`Transfers collection has data for sepolia (${count})`);
    } else {
      logFail('Transfers collection is empty for sepolia');
    }

    const [latest] = await transfers
      .find({ chain: 'sepolia' })
      .sort({ blockNumber: -1, block: -1, _id: -1 })
      .limit(1)
      .toArray();

    const latestTs =
      latest?.timestamp ?? (latest?._id ? latest._id.getTimestamp().getTime() : undefined);
    if (!latestTs) {
      logFail('Could not determine latest transfer timestamp to verify listener activity');
    } else {
      const ageMinutes = (Date.now() - latestTs) / 60000;
      if (ageMinutes < 10) {
        logOk(`Indexer listener is fresh (latest transfer ${ageMinutes.toFixed(1)}m ago)`);
      } else {
        logFail(`Indexer listener is stale (latest transfer ${ageMinutes.toFixed(1)}m ago)`);
      }
    }
  } catch (error) {
    logFail('MongoDB connectivity failed', error);
  } finally {
    await client?.close();
  }
};

const checkBackendHealth = async () => {
  const url = `${apiBase}/health?chain=sepolia`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const payload = await res.json();
    logOk(`/api/health reachable (${url})`);

    if (payload?.data?.synced) {
      logOk('Backend reports indexer synced');
    } else {
      logFail('Backend health reports out-of-sync', JSON.stringify(payload?.data ?? {}));
    }
  } catch (error) {
    logFail('Backend health endpoint failed', error);
  }
};

const checkApiBase = async () => {
  try {
    const res = await fetch(apiBase);
    if (!res.ok) {
      console.warn(`WARN NEXT_PUBLIC_API_URL responded with status ${res.status}`);
    }
    logOk(`NEXT_PUBLIC_API_URL reachable (${apiBase})`);
  } catch (error) {
    logFail('NEXT_PUBLIC_API_URL not reachable', error);
  }
};

const run = async () => {
  console.log('Running readiness checks...');
  await checkMongoAndData();
  await checkBackendHealth();
  await checkApiBase();

  if (failures.length) {
    console.error(`Readiness check failed (${failures.length} issues)`);
    failures.forEach((issue) => console.error(` - ${issue}`));
    process.exitCode = 1;
  } else {
    logOk('All readiness checks passed');
  }
};

run().catch((error) => {
  logFail('Unexpected readiness error', error);
  process.exitCode = 1;
});
