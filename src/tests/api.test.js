// tests/api.test.js
// Run: npm test
// Requires: npm install --save-dev jest supertest

const request = require('supertest');
const app = require('../src/app');

// ─── helpers ────────────────────────────────────────────────────────────────
let adminToken, analystToken, viewerToken;

async function login(email, password) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.token;
}

beforeAll(async () => {
  // These credentials must exist — run `npm run seed` before tests
  adminToken   = await login('admin@finance.dev',   'Admin@1234');
  analystToken = await login('analyst@finance.dev', 'Analyst@1234');
  viewerToken  = await login('viewer@finance.dev',  'Viewer@1234');
});

// ─── AUTH ────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@finance.dev', password: 'Admin@1234' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@finance.dev', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });

  test('returns 422 for missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Admin@1234' });

    expect(res.statusCode).toBe(422);
  });
});

// ─── RECORDS — ACCESS CONTROL ────────────────────────────────────────────────
describe('GET /api/records — role access', () => {
  test('analyst can list records', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('viewer is denied access to records', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/records');
    expect(res.statusCode).toBe(401);
  });
});

// ─── RECORDS — SEARCH ────────────────────────────────────────────────────────
describe('GET /api/records?search=', () => {
  test('search returns matching results', async () => {
    const res = await request(app)
      .get('/api/records?search=salary')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const allMatch = res.body.data.every(r =>
      (r.notes || '').toLowerCase().includes('salary') ||
      (r.category || '').toLowerCase().includes('salary') ||
      (r.description || '').toLowerCase().includes('salary')
    );
    expect(allMatch).toBe(true);
  });

  test('search with no match returns empty array', async () => {
    const res = await request(app)
      .get('/api/records?search=xyznotexistzzz')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── RECORDS — CRUD ───────────────────────────────────────────────────────────
describe('Financial record CRUD', () => {
  let createdId;

  test('admin can create a record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        type: 'income',
        category: 'Test',
        date: '2025-01-15',
        notes: 'Unit test record',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(Number(res.body.amount)).toBe(5000);
    createdId = res.body.id;
  });

  test('analyst cannot create a record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 100, type: 'income', category: 'Test', date: '2025-01-01' });

    expect(res.statusCode).toBe(403);
  });

  test('admin can update the record', async () => {
    const res = await request(app)
      .patch(`/api/records/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 9999 });

    expect(res.statusCode).toBe(200);
    expect(Number(res.body.amount)).toBe(9999);
  });

  test('admin can soft-delete the record', async () => {
    const res = await request(app)
      .delete(`/api/records/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  test('deleted record is no longer accessible', async () => {
    const res = await request(app)
      .get(`/api/records/${createdId}`)
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(404);
  });
});

// ─── VALIDATION ──────────────────────────────────────────────────────────────
describe('Input validation', () => {
  test('creating record with invalid type returns 422', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100, type: 'unknown', category: 'Test', date: '2025-01-01' });

    expect(res.statusCode).toBe(422);
  });

  test('creating record with negative amount returns 422', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: -500, type: 'income', category: 'Test', date: '2025-01-01' });

    expect(res.statusCode).toBe(422);
  });
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
describe('GET /api/dashboard/summary', () => {
  test('analyst can view dashboard summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('totalIncome');
    expect(res.body).toHaveProperty('totalExpenses');
    expect(res.body).toHaveProperty('netBalance');
  });

  test('viewer can view dashboard summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
  });
});

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────
describe('GET /api/records/export', () => {
  test('analyst can export records as CSV', async () => {
    const res = await request(app)
      .get('/api/records/export')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('id,amount,type,category');
  });

  test('viewer cannot export records', async () => {
    const res = await request(app)
      .get('/api/records/export')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(403);
  });
});
