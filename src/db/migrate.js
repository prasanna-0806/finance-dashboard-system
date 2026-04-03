require('dotenv').config();
const pool = require('./index');

const migrate = async () => {
  const client = await pool.connect();

  try {
    console.log('Running migrations...');

    await client.query(`
      CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');
    `).catch(() => console.log('user_role type already exists, skipping'));

    await client.query(`
      CREATE TYPE record_type AS ENUM ('income', 'expense');
    `).catch(() => console.log('record_type type already exists, skipping'));

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        user_role NOT NULL DEFAULT 'viewer',
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Financial records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_records (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        amount      NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
        type        record_type NOT NULL,
        category    VARCHAR(100) NOT NULL,
        date        DATE NOT NULL,
        notes       TEXT,
        created_by  UUID NOT NULL REFERENCES users(id),
        deleted_at  TIMESTAMPTZ DEFAULT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes for common query patterns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_records_type     ON financial_records(type)     WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_records_date     ON financial_records(date)     WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_records_deleted  ON financial_records(deleted_at);
    `);

    // Auto-update updated_at on row changes
    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
      CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_records_updated_at ON financial_records;
      CREATE TRIGGER trg_records_updated_at
        BEFORE UPDATE ON financial_records
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
