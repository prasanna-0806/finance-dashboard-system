// src/db/seed.js
// Run: node src/db/seed.js
// Seeds 3 users (one per role) + 60 financial records with realistic data

require('dotenv').config();
const pool = require('./index');
const bcrypt = require('bcryptjs');

const HASH_ROUNDS = 12;

const users = [
  { name: 'Admin User',    email: 'admin@finance.dev',   password: 'Admin@1234',   role: 3, status: 'active' },
  { name: 'Analyst User',  email: 'analyst@finance.dev', password: 'Analyst@1234', role: 2, status: 'active' },
  { name: 'Viewer User',   email: 'viewer@finance.dev',  password: 'Viewer@1234',  role: 1, status: 'active' },
];

const categories = ['Salary', 'Freelance', 'Investment', 'Rent', 'Utilities', 'Groceries', 'Marketing', 'Travel', 'Equipment', 'Insurance', 'Subscriptions', 'Consulting'];

function randomBetween(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function generateRecords(adminId) {
  const records = [];

  // Monthly salary — last 6 months
  for (let m = 0; m < 6; m++) {
    records.push({
      amount: 85000,
      type: 'income',
      category: 'Salary',
      date: daysAgo(m * 30 + 1),
      notes: `Monthly salary — month ${m + 1}`,
      description: 'Regular employee payroll deposit',
      created_by: adminId,
    });
  }

  // Freelance income — 8 entries
  const freelanceAmounts = [12000, 8500, 22000, 6000, 15000, 9800, 18000, 11000];
  freelanceAmounts.forEach((amount, i) => {
    records.push({
      amount,
      type: 'income',
      category: 'Freelance',
      date: daysAgo(i * 11 + 3),
      notes: `Freelance project delivery #${i + 1}`,
      description: 'Client milestone payment received',
      created_by: adminId,
    });
  });

  // Investment returns
  records.push({ amount: 45000, type: 'income', category: 'Investment', date: daysAgo(15), notes: 'Quarterly dividend payout', description: 'Equity portfolio dividends', created_by: adminId });
  records.push({ amount: 28000, type: 'income', category: 'Investment', date: daysAgo(75), notes: 'Mutual fund redemption', description: 'Partial redemption of liquid fund', created_by: adminId });
  records.push({ amount: 62000, type: 'income', category: 'Consulting', date: daysAgo(22), notes: 'Strategy consulting retainer', description: 'Q3 retainer fee from client', created_by: adminId });

  // Expenses — varied
  const expenses = [
    { amount: 22000, category: 'Rent',          notes: 'Office space rent — monthly',        description: 'Co-working space lease',        days: 2   },
    { amount: 22000, category: 'Rent',          notes: 'Office space rent — monthly',        description: 'Co-working space lease',        days: 32  },
    { amount: 22000, category: 'Rent',          notes: 'Office space rent — monthly',        description: 'Co-working space lease',        days: 62  },
    { amount: 3400,  category: 'Utilities',     notes: 'Electricity & internet bill',        description: 'Monthly utility payment',      days: 5   },
    { amount: 3200,  category: 'Utilities',     notes: 'Electricity & internet bill',        description: 'Monthly utility payment',      days: 35  },
    { amount: 8500,  category: 'Groceries',     notes: 'Office pantry restocking',          description: 'Monthly grocery run',          days: 7   },
    { amount: 6200,  category: 'Groceries',     notes: 'Office pantry restocking',          description: 'Monthly grocery run',          days: 37  },
    { amount: 15000, category: 'Marketing',     notes: 'Google Ads campaign — Q3',          description: 'Performance marketing spend',  days: 10  },
    { amount: 9000,  category: 'Marketing',     notes: 'LinkedIn sponsored posts',          description: 'B2B lead generation campaign', days: 45  },
    { amount: 18500, category: 'Travel',        notes: 'Client meeting — Bangalore trip',   description: 'Flights + hotel + local travel',days: 14 },
    { amount: 6000,  category: 'Travel',        notes: 'Team offsite day trip',             description: 'Transport & meals',            days: 50  },
    { amount: 42000, category: 'Equipment',     notes: 'MacBook Pro for new hire',          description: 'Hardware purchase',            days: 20  },
    { amount: 12000, category: 'Equipment',     notes: 'Monitor & peripherals',             description: 'Workstation setup',            days: 55  },
    { amount: 8800,  category: 'Insurance',     notes: 'Team health insurance premium',     description: 'Group medical insurance',      days: 28  },
    { amount: 2200,  category: 'Subscriptions', notes: 'SaaS tools — monthly',              description: 'Slack, Notion, Figma licences', days: 3  },
    { amount: 2200,  category: 'Subscriptions', notes: 'SaaS tools — monthly',              description: 'Slack, Notion, Figma licences', days: 33 },
    { amount: 2200,  category: 'Subscriptions', notes: 'SaaS tools — monthly',              description: 'Slack, Notion, Figma licences', days: 63 },
    { amount: 5500,  category: 'Consulting',    notes: 'Legal advisory fees',               description: 'Contract review & compliance', days: 18  },
    { amount: 3800,  category: 'Utilities',     notes: 'Cloud hosting — AWS bill',          description: 'Monthly AWS infrastructure',   days: 6   },
    { amount: 3600,  category: 'Utilities',     notes: 'Cloud hosting — AWS bill',          description: 'Monthly AWS infrastructure',   days: 36  },
  ];

  expenses.forEach(e => {
    records.push({ ...e, type: 'expense', created_by: adminId });
  });

  return records;
}

async function seed() {
  console.log('🌱  Starting seed...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Upsert users
    const insertedAdminId = await (async () => {
      for (const u of users) {
        const hash = await bcrypt.hash(u.password, HASH_ROUNDS);
        const res = await client.query(
          `INSERT INTO users (name, email, password_hash, role, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status
           RETURNING id, role`,
          [u.name, u.email, hash, u.role, u.status]
        );
        console.log(`  ✔ User: ${u.email} (role ${u.role})`);
        if (u.role === 3) return res.rows[0].id;
      }
    })();

    // Seed financial records
    const records = generateRecords(insertedAdminId);
    for (const r of records) {
      await client.query(
        `INSERT INTO financial_records (amount, type, category, date, notes, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [r.amount, r.type, r.category, r.date, r.notes, r.description, r.created_by]
      );
    }
    console.log(`  ✔ Inserted ${records.length} financial records`);

    await client.query('COMMIT');
    console.log('\n✅  Seed complete!\n');
    console.log('  Credentials:');
    users.forEach(u => console.log(`    ${u.email.padEnd(28)} password: ${u.password}`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
