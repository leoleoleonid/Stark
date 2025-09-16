import { ConcurrentFetcher, FetchResponse, UrlFetcher } from './ConcurrentFetcher';
import { CustomAsyncQueue } from './CustomAsyncQueue';

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

describe('ConcurrentFetcher', () => {
    let mockFetcher: jest.MockedFunction<UrlFetcher>;
    let queue: CustomAsyncQueue;
    let fetcher: ConcurrentFetcher;

    beforeEach(() => {
        mockFetcher = jest.fn();
        queue = new CustomAsyncQueue({ concurrency: 2 });
        fetcher = new ConcurrentFetcher(mockFetcher, queue);
    });

    describe('constructor', () => {
        it('should create instance with provided fetcher and queue', () => {
            const customQueue = new CustomAsyncQueue({ concurrency: 3 });
            const customFetcher = new ConcurrentFetcher(mockFetcher, customQueue);

            expect(customFetcher).toBeInstanceOf(ConcurrentFetcher);
        });
    });

    describe('static factory methods', () => {
        describe('createWithCustomQueue', () => {
            it('should create instance with custom queue and default fetcher', () => {
                const instance = ConcurrentFetcher.createWithCustomQueue();
                expect(instance).toBeInstanceOf(ConcurrentFetcher);
            });

            it('should create instance with custom queue and custom fetcher', () => {
                const instance = ConcurrentFetcher.createWithCustomQueue(mockFetcher, 3);
                expect(instance).toBeInstanceOf(ConcurrentFetcher);
            });

            it('should respect custom concurrency setting', () => {
                const instance = ConcurrentFetcher.createWithCustomQueue(mockFetcher, 1);
                expect(instance).toBeInstanceOf(ConcurrentFetcher);
                // We can't directly test concurrency here, but we can in integration tests
            });
        });

        describe('createWithPQueue', () => {
            it('should create instance with PQueue', () => {
                const instance = ConcurrentFetcher.createWithPQueue(mockFetcher, 2);
                expect(instance).toBeInstanceOf(ConcurrentFetcher);
            });
        });
    });

    describe('fetchUrlsConcurrently', () => {
        it('should fetch all URLs and return results', async () => {
            const mockResponses: FetchResponse[] = [
                { url: 'https://api.test/1', status: 200, data: { id: 1, title: 'Post 1' } },
                { url: 'https://api.test/2', status: 200, data: { id: 2, title: 'Post 2' } },
                { url: 'https://api.test/3', status: 200, data: { id: 3, title: 'Post 3' } }
            ];

            mockFetcher
                .mockResolvedValueOnce(mockResponses[0])
                .mockResolvedValueOnce(mockResponses[1])
                .mockResolvedValueOnce(mockResponses[2]);

            const urls = ['https://api.test/1', 'https://api.test/2', 'https://api.test/3'];
            const results = await fetcher.fetchUrlsConcurrently(urls);

            expect(results).toHaveLength(3);
            expect(results).toEqual(expect.arrayContaining(mockResponses));
            expect(mockFetcher).toHaveBeenCalledTimes(3);
            expect(mockFetcher).toHaveBeenCalledWith('https://api.test/1');
            expect(mockFetcher).toHaveBeenCalledWith('https://api.test/2');
            expect(mockFetcher).toHaveBeenCalledWith('https://api.test/3');
            expect(console.log).toHaveBeenCalledWith('DONE', 3);
        });

        it('should respect concurrency limit using CustomAsyncQueue', async () => {
            let activeRequests = 0;
            let maxConcurrentRequests = 0;

            mockFetcher.mockImplementation(async (url: string) => {
                activeRequests++;
                maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 50));

                activeRequests--;
                return {
                    url,
                    status: 200,
                    data: { title: 'Test post' }
                };
            });

            const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
            await fetcher.fetchUrlsConcurrently(urls);

            expect(maxConcurrentRequests).toBeLessThanOrEqual(2); // queue concurrency is 2
            expect(mockFetcher).toHaveBeenCalledTimes(5);
        });

        it('should handle failed requests gracefully', async () => {
            const successResponse: FetchResponse = {
                url: 'https://good.com',
                status: 200,
                data: { title: 'Success' }
            };

            mockFetcher
                .mockResolvedValueOnce(successResponse)
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    url: 'https://good2.com',
                    status: 200,
                    data: { title: 'Success 2' }
                });

            const urls = ['https://good.com', 'https://bad.com', 'https://good2.com'];
            const results = await fetcher.fetchUrlsConcurrently(urls);

            // Should return results for successful requests only
            expect(results).toHaveLength(2);
            expect(results).toEqual(expect.arrayContaining([
                successResponse,
                { url: 'https://good2.com', status: 200, data: { title: 'Success 2' } }
            ]));
            expect(console.error).toHaveBeenCalledWith(expect.any(Error));
            expect(console.log).toHaveBeenCalledWith('DONE', 2);
        });

        it('should handle empty URL array', async () => {
            const results = await fetcher.fetchUrlsConcurrently([]);

            expect(results).toHaveLength(0);
            expect(mockFetcher).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('DONE', 0);
        });

        it('should handle single URL', async () => {
            const mockResponse: FetchResponse = {
                url: 'https://single.com',
                status: 200,
                data: { title: 'Single request' }
            };

            mockFetcher.mockResolvedValueOnce(mockResponse);

            const results = await fetcher.fetchUrlsConcurrently(['https://single.com']);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual(mockResponse);
            expect(mockFetcher).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith('DONE', 1);
        });

        it('should handle all requests failing', async () => {
            mockFetcher
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockRejectedValueOnce(new Error('Error 3'));

            const urls = ['https://bad1.com', 'https://bad2.com', 'https://bad3.com'];
            const results = await fetcher.fetchUrlsConcurrently(urls);

            expect(results).toHaveLength(0);
            expect(console.error).toHaveBeenCalledTimes(3);
            expect(mockFetcher).toHaveBeenCalledTimes(3);
            expect(console.log).toHaveBeenCalledWith('DONE', 0);
        });

        it('should maintain result collection despite async execution order', async () => {
            // Simulate different response times to test async behavior
            mockFetcher
                .mockImplementationOnce(async (url: string) => {
                    await new Promise(resolve => setTimeout(resolve, 100)); // Slow
                    return { url, status: 200, data: { speed: 'slow' } };
                })
                .mockImplementationOnce(async (url: string) => {
                    await new Promise(resolve => setTimeout(resolve, 10)); // Fast
                    return { url, status: 200, data: { speed: 'fast' } };
                })
                .mockImplementationOnce(async (url: string) => {
                    await new Promise(resolve => setTimeout(resolve, 50)); // Medium
                    return { url, status: 200, data: { speed: 'medium' } };
                });

            const urls = ['https://slow.com', 'https://fast.com', 'https://medium.com'];
            const results = await fetcher.fetchUrlsConcurrently(urls);

            expect(results).toHaveLength(3);
            // Results should contain all responses regardless of completion order
            expect(results.some(r => r.url === 'https://slow.com')).toBe(true);
            expect(results.some(r => r.url === 'https://fast.com')).toBe(true);
            expect(results.some(r => r.url === 'https://medium.com')).toBe(true);
        });

        it('should handle mixed success and failure with proper logging', async () => {
            mockFetcher
                .mockResolvedValueOnce({ url: 'https://success1.com', status: 200, data: { result: 'ok' } })
                .mockRejectedValueOnce(new Error('First error'))
                .mockResolvedValueOnce({ url: 'https://success2.com', status: 404, data: { error: 'not found' } })
                .mockRejectedValueOnce(new Error('Second error'));

            const urls = ['https://success1.com', 'https://fail1.com', 'https://success2.com', 'https://fail2.com'];
            const results = await fetcher.fetchUrlsConcurrently(urls);

            expect(results).toHaveLength(2);
            expect(results).toEqual(expect.arrayContaining([
                { url: 'https://success1.com', status: 200, data: { result: 'ok' } },
                { url: 'https://success2.com', status: 404, data: { error: 'not found' } }
            ]));
            expect(console.error).toHaveBeenCalledTimes(2);
            expect(console.log).toHaveBeenCalledWith('DONE', 2);
        });

        it('should work with high concurrency queue', async () => {
            const highConcurrencyQueue = new CustomAsyncQueue({ concurrency: 10 });
            const highConcurrencyFetcher = new ConcurrentFetcher(mockFetcher, highConcurrencyQueue);

            const responses = Array.from({ length: 5 }, (_, i) => ({
                url: `https://api.test/${i + 1}`,
                status: 200,
                data: { id: i + 1 }
            }));

            responses.forEach(response => mockFetcher.mockResolvedValueOnce(response));

            const urls = responses.map(r => r.url);
            const results = await highConcurrencyFetcher.fetchUrlsConcurrently(urls);

            expect(results).toHaveLength(5);
            expect(results).toEqual(expect.arrayContaining(responses));
        });

        it('should work with concurrency of 1', async () => {
            const singleQueue = new CustomAsyncQueue({ concurrency: 1 });
            const singleFetcher = new ConcurrentFetcher(mockFetcher, singleQueue);

            let activeRequests = 0;
            let maxConcurrentRequests = 0;

            mockFetcher.mockImplementation(async (url: string) => {
                activeRequests++;
                maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);

                await new Promise(resolve => setTimeout(resolve, 30));

                activeRequests--;
                return { url, status: 200, data: {} };
            });

            const urls = ['url1', 'url2', 'url3'];
            await singleFetcher.fetchUrlsConcurrently(urls);

            expect(maxConcurrentRequests).toBe(1);
            expect(mockFetcher).toHaveBeenCalledTimes(3);
        });

        it('should handle queue errors gracefully', async () => {
            mockFetcher
                .mockResolvedValueOnce({ url: 'https://test1.com', status: 200, data: {} })
                .mockRejectedValueOnce(new Error('Fetcher error'))
                .mockResolvedValueOnce({ url: 'https://test3.com', status: 200, data: {} });

            const urls = ['https://test1.com', 'https://test2.com', 'https://test3.com'];

            // This should not throw even with errors
            await expect(fetcher.fetchUrlsConcurrently(urls)).resolves.not.toThrow();

            const results = await fetcher.fetchUrlsConcurrently(urls);

            // Reset mocks for second call
            mockFetcher.mockClear();
            mockFetcher
                .mockResolvedValueOnce({ url: 'https://test1.com', status: 200, data: {} })
                .mockRejectedValueOnce(new Error('Fetcher error'))
                .mockResolvedValueOnce({ url: 'https://test3.com', status: 200, data: {} });

            const secondResults = await fetcher.fetchUrlsConcurrently(urls);
            expect(secondResults).toHaveLength(2);
        });
    });

    describe('integration with CustomAsyncQueue', () => {
        it('should properly utilize queue concurrency control', async () => {
            const concurrency3Queue = new CustomAsyncQueue({ concurrency: 3 });
            const concurrency3Fetcher = new ConcurrentFetcher(mockFetcher, concurrency3Queue);

            let activeRequests = 0;
            let maxConcurrentRequests = 0;

            mockFetcher.mockImplementation(async (url: string) => {
                activeRequests++;
                maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);

                await new Promise(resolve => setTimeout(resolve, 100));

                activeRequests--;
                return { url, status: 200, data: { processed: true } };
            });

            const urls = Array.from({ length: 8 }, (_, i) => `https://test${i + 1}.com`);
            await concurrency3Fetcher.fetchUrlsConcurrently(urls);

            expect(maxConcurrentRequests).toBe(3);
            expect(mockFetcher).toHaveBeenCalledTimes(8);
        });

        it('should wait for all tasks to complete via queue.onIdle()', async () => {
            const slowResponses = Array.from({ length: 3 }, (_, i) => ({
                url: `https://slow${i + 1}.com`,
                status: 200,
                data: { delay: 100 + i * 50 }
            }));

            mockFetcher
                .mockImplementationOnce(async () => {
                    await new Promise(resolve => setTimeout(resolve, 150));
                    return slowResponses[0];
                })
                .mockImplementationOnce(async () => {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    return slowResponses[1];
                })
                .mockImplementationOnce(async () => {
                    await new Promise(resolve => setTimeout(resolve, 250));
                    return slowResponses[2];
                });

            const urls = slowResponses.map(r => r.url);
            const startTime = Date.now();

            const results = await fetcher.fetchUrlsConcurrently(urls);

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            expect(results).toHaveLength(3);
            // Should wait for all tasks - longest individual task is 250ms
            // But with concurrency 2, tasks 1&2 run together, then task 3
            // So minimum time should be around 250ms+ (task 3's delay)
            expect(totalTime).toBeGreaterThan(240);
            expect(results).toEqual(expect.arrayContaining(slowResponses));
        });
    });
});