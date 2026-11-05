import { ApiError, cachedGet, clearApiCache } from '../services/api';

describe('api service', () => {
  beforeEach(() => clearApiCache());
  afterEach(() => vi.restoreAllMocks());

  it('caches identical requests (one network call)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: 1 }) });
    vi.stubGlobal('fetch', fetchMock);
    await Promise.all([cachedGet('/a'), cachedGet('/a')]);
    await cachedGet('/a');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError on HTTP failure and allows retry afterwards', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: 1 }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(cachedGet('/b')).rejects.toBeInstanceOf(ApiError);
    await expect(cachedGet('/b')).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
