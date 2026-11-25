const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app, setupTestDB, teardownTestDB } = require('./helpers/testServer');
const User = require('../src/models/User');
const Material = require('../src/models/Material');

function sign(userId, role = 'user') {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'testsecret');
}

describe('Materials API', () => {
  let user;
  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
    await setupTestDB();
    user = await User.create({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  test('GET /api/materials returns only approved materials with pagination and filters', async () => {
    await Material.create([
      { title: 'Calc I', subject: 'Math', semester: '1', uploaderId: user._id, filePath: 'a', fileName: 'a.pdf', fileType: 'pdf', fileSize: 100, approved: true },
      { title: 'Calc II', subject: 'Math', semester: '2', uploaderId: user._id, filePath: 'b', fileName: 'b.pdf', fileType: 'pdf', fileSize: 100, approved: false },
      { title: 'Physics', subject: 'Physics', semester: '1', uploaderId: user._id, filePath: 'c', fileName: 'c.pdf', fileType: 'pdf', fileSize: 100, approved: true },
    ]);

    const res = await request(app).get('/api/materials').query({ page: 1, limit: 10, subject: 'math' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.every(m => m.subject.toLowerCase().includes('math'))).toBe(true);
    // ensure unapproved is not returned
    expect(res.body.data.length).toBe(1);
  });
});

