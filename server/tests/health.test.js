const request = require('supertest');

jest.mock('../src/config/db', () => ({
connectDB: jest.fn(),
}));

const app = require('../src/app');

describe('GET /api/health', () => {
it('should return the health endpoint response', async () => {
const response = await request(app).get('/api/health');

expect([200, 503]).toContain(response.status);
expect(response.body).toHaveProperty('status');
expect(response.body).toHaveProperty('uptime');
expect(response.body).toHaveProperty('database');

});
});