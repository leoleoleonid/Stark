import { fetchUrlsConcurrently, fetchUrl } from './queueExercise.js';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch', () => ({
  default: jest.fn(),
}));
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  jest.clearAllMocks();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('fetchUrlsConcurrently', () => {
  it('should fetch all URLs and return results', async () => {
    // Mock successful responses
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ id: 1, title: 'Post 1' }),
      } as any)
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ id: 2, title: 'Post 2' }),
      } as any)
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ id: 3, title: 'Post 3' }),
      } as any);

    const urls = ['https://api.test/1', 'https://api.test/2', 'https://api.test/3'];
    const results = await fetchUrlsConcurrently(urls, 2);

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      url: 'https://api.test/1',
      status: 200,
      data: { id: 1, title: 'Post 1' }
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should respect max concurrency limit', async () => {
    let activeRequests = 0;
    let maxConcurrentRequests = 0;

    mockFetch.mockImplementation(async () => {
      activeRequests++;
      maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));

      activeRequests--;
      return {
        status: 200,
        json: async () => ({ title: 'Test post' }),
      } as any;
    });

    const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
    const maxConcurrency = 2;

    await fetchUrlsConcurrently(urls, maxConcurrency);

    expect(maxConcurrentRequests).toBeLessThanOrEqual(maxConcurrency);
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('should handle failed requests gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ title: 'Success' }),
      } as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ title: 'Success 2' }),
      } as any);

    const urls = ['https://good.com', 'https://bad.com', 'https://good2.com'];
    const results = await fetchUrlsConcurrently(urls, 2);

    // Should return results for successful requests only
    expect(results).toHaveLength(2);
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle empty URL array', async () => {
    const results = await fetchUrlsConcurrently([], 2);
    expect(results).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('fetchUrl', () => {
  it('should fetch URL and return formatted response', async () => {
    const mockResponse = {
      status: 200,
      json: async () => ({ id: 1, title: 'Test Post' }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchUrl('https://test.com');

    expect(result).toEqual({
      url: 'https://test.com',
      status: 200,
      data: { id: 1, title: 'Test Post' }
    });
    expect(mockFetch).toHaveBeenCalledWith('https://test.com');
  });

  it('should throw error for failed requests', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchUrl('https://bad.com')).rejects.toThrow('Network error');
  });
});
