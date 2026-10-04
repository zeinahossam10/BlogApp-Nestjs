import 'dotenv/config';

const testDatabase = process.env.TEST_DB_NAME?.trim();
const developmentDatabase = process.env.DB_NAME?.trim();

if (!testDatabase) {
  throw new Error('E2E tests require TEST_DB_NAME to name a dedicated PostgreSQL test database.');
}

if (!developmentDatabase || testDatabase === developmentDatabase) {
  throw new Error('E2E tests stopped: TEST_DB_NAME must be set and must differ from DB_NAME.');
}

process.env.DB_NAME = testDatabase;
