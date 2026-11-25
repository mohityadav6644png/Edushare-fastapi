const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, setupTestDB, teardownTestDB } = require('./helpers/testServer');
const User = require('../src/models/User');
const Material = require('../src/models/Material');

function authHeader(userId, role = 'user') {
  const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'testsecret');
  return { Authorization: `Bearer ${token}` };
}

describe('Ratings API', () => {
  let user;
  let material;
  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
    await setupTestDB();
    user = await User.create({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
    material = await Material.create({ title: 'Algebra', subject: 'Math', semester: '1', uploaderId: user._id, filePath: 'x', fileName: 'x.pdf', fileType: 'pdf', fileSize: 100, approved: true });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  test('POST /api/materials/:id/rate enforces bounds and creates rating', async () => {
    const tooHigh = await request(app)
      .post(`/api/materials/${material._id}/rate`)
      .set(authHeader(user._id))
      .send({ rating: 6, comment: 'Too high' });
    expect(tooHigh.status).toBe(400);

    const ok = await request(app)
      .post(`/api/materials/${material._id}/rate`)
      .set(authHeader(user._id))
      .send({ rating: 5, comment: 'Great' });
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);

    const list = await request(app).get(`/api/materials/${material._id}/ratings`).query({ page: 1, limit: 10 });
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
  });
});

