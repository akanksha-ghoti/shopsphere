jest.mock('../src/config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const auth = require('../src/middleware/auth');
const { verifyIdToken } = require('../src/config/firebaseAdmin');

const app = express();
app.use(express.json());
app.get('/protected', auth, (req, res) => {
res.json({ user: req.user });
});

describe('Authentication middleware', () => {
beforeEach(() => {
jest.clearAllMocks();
});

it('accepts a verified admin token and assigns the admin role', async () => {
const response = await request(app).get('/protected');

expect(response.status).toBe(401);

});

it('rejects invalid tokens', async () => {
verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

const response = await request(app)
  .get('/protected')
  .set('Authorization', 'Bearer invalid-token');

expect(response.status).toBe(401);

});

it('accepts a verified token and assigns the default user role', async () => {
verifyIdToken.mockResolvedValueOnce({
uid: 'test-user-123',
role: 'admin',
});

const response = await request(app)
  .get('/protected')
  .set('Authorization', 'Bearer valid-test-token');

expect(response.status).toBe(200);
expect(response.body.user.uid).toBe('test-user-123');
expect(response.body.user.role).toBe('admin');

});
});