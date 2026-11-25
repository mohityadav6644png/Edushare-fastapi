const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, setupTestDB, teardownTestDB } = require('./helpers/testServer');
const User = require('../src/models/User');
const Material = require('../src/models/Material');

function tokenFor(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'testsecret');
}

describe('Admin API', () => {
  let admin;
  let user;
  let material;
  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
    await setupTestDB();
    admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'password123', role: 'admin' });
    user = await User.create({ name: 'User', email: 'user@example.com', password: 'password123', role: 'user' });
    material = await Material.create({ title: 'Pending', subject: 'Chem', semester: '2', uploaderId: user._id, filePath: 'p', fileName: 'p.pdf', fileType: 'pdf', fileSize: 100, approved: false });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  test('Non-admin is forbidden', async () => {
    const t = tokenFor(user);
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(403);
  });

  test('Approve material via alias route', async () => {
    const t = tokenFor(admin);
    const res = await request(app)
      .put(`/api/admin/approve/${material._id}`)
      .set('Authorization', `Bearer ${t}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const uploads = await request(app)
      .get('/api/admin/uploads')
      .set('Authorization', `Bearer ${t}`);
    expect(uploads.status).toBe(200);
    expect(uploads.body.total).toBe(1);
  });

  test('Toggle user block', async () => {
    const t = tokenFor(admin);
    const res = await request(app)
      .put(`/api/admin/toggle/${user._id}`)
      .set('Authorization', `Bearer ${t}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(true);
  });
});

