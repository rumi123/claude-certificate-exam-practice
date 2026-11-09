import { closeDb, getDb, getDbPath } from '../lib/db/client';

getDb();
console.log(`migrated ${getDbPath()}`);
closeDb();
