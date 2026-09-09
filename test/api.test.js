const { Server } = require('../src/server/server');
const { CacheManager } = require('../src/server/storage/cacheManager');
const { DatabaseManager } = require('../src/server/storage/databaseManager');

describe('API routes', () => {
  let server;
  let cacheManager;
  let databaseManager;
  let token;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

    cacheManager = new CacheManager({});
    databaseManager = new DatabaseManager({ cacheManager });

    // Seed database with representative records (note shape: { data: ... })
    const now = Date.now();

    databaseManager.upsert('github.profile', { data: { username: 'akhand', profileUrl: 'https://example' } });
    databaseManager.upsert('github.events', { data: [{ repo: { name: 'r1' }, createdAt: now }, { repo: { name: 'r2' }, createdAt: now - 1000 }] });
    databaseManager.upsert('github.repositories', { data: [{ name: 'repo1', updatedAt: now }, { name: 'repo2', updatedAt: now - 2000 }] });
    databaseManager.upsert('github.heatmap', { data: { years: { '2025': { heatmap: [{ date: now, count: 1 }] } } } });

    databaseManager.upsert('leetcode.profile', { data: { username: 'akhand_raj' } });
    databaseManager.upsert('leetcode.submissiondata', { data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    databaseManager.upsert('leetcode.heatmap.history', { data: { years: { '2025': { heatmap: [{ date: now, count: 2 }] } } } });
    databaseManager.upsert('leetcode.recentsolution', { data: [1,2,3,4,5] });
    databaseManager.upsert('leetcode.recentsubmission', { data: [1,2,3,4] });
    databaseManager.upsert('leetcode.skillstats', { data: { skills: [] } });

    databaseManager.upsert('roadmap.profile', { data: { activity: { heatmap: { years: { '2025': { heatmap: [{ date: now, count: 1 }] } } } }, roadmap: [] } });

    databaseManager.upsert('spotify.current_playing', { data: { track: 'song1' } });
    databaseManager.upsert('spotify.user_playlists', { data: [{ name: 'pl1' }, { name: 'pl2' }] });

    server = new Server({ databaseManager, cacheManager });

    // wait for fastify plugins/routes to be ready
    await server.app.ready();

    // create jwt token for protected endpoints
    token = server.app.jwt.sign({ type: 'frontend' });
  });

  test('GET /github/profile returns profile', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/github/profile', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.data.username).toBe('akhand');
  });

  test('GET /github/events?n=1 returns one event', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/github/events?n=1', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(1);
  });

  test('GET /github/heatmap returns latest year', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/github/heatmap', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.year).toBeDefined();
  });

  test('GET /leetcode/profile returns profile', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/leetcode/profile', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.data.username).toBe('akhand_raj');
  });

  test('GET /spotify/current-playing returns current playing (no cache)', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/spotify/current-playing', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.data.track).toBe('song1');
  });

  test('GET /gernal/heatmap returns combined heatmaps', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/gernal/heatmap', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
    // expect some keys present
    expect(Object.keys(body.data)).toEqual(expect.arrayContaining(['github','leetcode','roadmap']));
  });

});
