
import {CustomAsyncQueue} from "./CustomAsyncQueue";

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;

beforeEach(() => {
    console.error = jest.fn();
    jest.clearAllMocks();
});

afterAll(() => {
    console.error = originalConsoleError;
});

describe('CustomAsyncQueue', () => {
    let queue: CustomAsyncQueue;

    beforeEach(() => {
        queue = new CustomAsyncQueue({ concurrency: 2 });
    });

    describe('constructor', () => {
        it('should create queue with specified concurrency', () => {
            const customQueue = new CustomAsyncQueue({ concurrency: 3 });
            expect(customQueue).toBeInstanceOf(CustomAsyncQueue);
            expect(customQueue.getConcurrency).toBe(3);
        });

        it('should handle concurrency of 1', () => {
            const singleQueue = new CustomAsyncQueue({ concurrency: 1 });
            expect(singleQueue).toBeInstanceOf(CustomAsyncQueue);
            expect(singleQueue.getConcurrency).toBe(1);
        });

        it('should initialize with empty queue and no running tasks', () => {
            const newQueue = new CustomAsyncQueue({ concurrency: 5 });
            expect(newQueue.getQueueLength).toBe(0);
            expect(newQueue.getRunningTasks).toBe(0);
        });
    });

    describe('add', () => {
        it('should execute single task immediately', async () => {
            const mockTask = jest.fn().mockResolvedValue('result');

            queue.add(mockTask);

            // Wait a bit for the task to start
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockTask).toHaveBeenCalledTimes(1);
            expect(queue.getRunningTasks).toBe(0); // Should be 0 after completion
        });

        it('should execute multiple tasks up to concurrency limit', async () => {
            const task1 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
            const task2 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
            const task3 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            queue.add(task1);
            queue.add(task2);
            queue.add(task3);

            // Wait a bit for initial tasks to start
            await new Promise(resolve => setTimeout(resolve, 10));

            // First two tasks should start immediately (concurrency = 2)
            expect(task1).toHaveBeenCalledTimes(1);
            expect(task2).toHaveBeenCalledTimes(1);
            // Third task should be queued
            expect(task3).not.toHaveBeenCalled();
            expect(queue.getRunningTasks).toBe(2);
            expect(queue.getQueueLength).toBe(1);
        });

        it('should start queued tasks when running tasks complete', async () => {
            const task1 = jest.fn().mockResolvedValue('result1');
            const task2 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('result2'), 50)));
            const task3 = jest.fn().mockResolvedValue('result3');

            queue.add(task1);
            queue.add(task2);
            queue.add(task3);

            // Wait for task1 to complete and task3 to start
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(task1).toHaveBeenCalledTimes(1);
            expect(task2).toHaveBeenCalledTimes(1);
            expect(task3).toHaveBeenCalledTimes(1); // Should start after task1 completes
        });
    });

    describe('concurrency control', () => {
        it('should respect concurrency limit', async () => {
            let activeTasks = 0;
            let maxConcurrentTasks = 0;

            const createTask = () => jest.fn().mockImplementation(async () => {
                activeTasks++;
                maxConcurrentTasks = Math.max(maxConcurrentTasks, activeTasks);

                await new Promise(resolve => setTimeout(resolve, 50));

                activeTasks--;
                return 'done';
            });

            const tasks = Array.from({ length: 5 }, createTask);

            tasks.forEach(task => queue.add(task));

            await queue.onIdle();

            expect(maxConcurrentTasks).toBeLessThanOrEqual(2);
            expect(queue.getRunningTasks).toBe(0);
            expect(queue.getQueueLength).toBe(0);
            tasks.forEach(task => {
                expect(task).toHaveBeenCalledTimes(1);
            });
        });

        it('should handle concurrency of 1 correctly', async () => {
            const singleQueue = new CustomAsyncQueue({ concurrency: 1 });
            let activeTasks = 0;
            let maxConcurrentTasks = 0;

            const createTask = () => jest.fn().mockImplementation(async () => {
                activeTasks++;
                maxConcurrentTasks = Math.max(maxConcurrentTasks, activeTasks);

                await new Promise(resolve => setTimeout(resolve, 30));

                activeTasks--;
                return 'done';
            });

            const tasks = Array.from({ length: 3 }, createTask);

            tasks.forEach(task => singleQueue.add(task));

            await singleQueue.onIdle();

            expect(maxConcurrentTasks).toBe(1);
            expect(singleQueue.getRunningTasks).toBe(0);
            tasks.forEach(task => {
                expect(task).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('onIdle', () => {
        it('should resolve immediately when queue is empty', async () => {
            const startTime = Date.now();
            await queue.onIdle();
            const endTime = Date.now();

            // Should resolve almost immediately
            expect(endTime - startTime).toBeLessThan(50);
        });

        it('should wait for all tasks to complete', async () => {
            const task1 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('done1'), 100)));
            const task2 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('done2'), 150)));

            queue.add(task1);
            queue.add(task2);

            const startTime = Date.now();
            await queue.onIdle();
            const endTime = Date.now();

            // Should wait for both tasks to complete
            expect(endTime - startTime).toBeGreaterThan(140);
            expect(task1).toHaveBeenCalledTimes(1);
            expect(task2).toHaveBeenCalledTimes(1);
            expect(queue.getRunningTasks).toBe(0);
        });

        it('should handle multiple onIdle calls concurrently', async () => {
            const task = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('done'), 100)));

            queue.add(task);

            const promise1 = queue.onIdle();
            const promise2 = queue.onIdle();

            const results = await Promise.all([promise1, promise2]);

            expect(results).toEqual([undefined, undefined]);
            expect(task).toHaveBeenCalledTimes(1);
        });
    });

    describe('error handling', () => {
        it('should continue processing other tasks when one task fails', async () => {
            const successTask1 = jest.fn().mockResolvedValue('success1');
            const failingTask = jest.fn().mockImplementation(async () => {
                throw new Error('Task failed');
            });
            const successTask2 = jest.fn().mockResolvedValue('success2');

            queue.add(successTask1);
            queue.add(failingTask);
            queue.add(successTask2);

            await queue.onIdle();

            expect(successTask1).toHaveBeenCalledTimes(1);
            expect(failingTask).toHaveBeenCalledTimes(1);
            expect(successTask2).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith('Task error:', expect.any(Error));
        });

        it('should not stop queue processing on task rejection', async () => {
            const task1 = jest.fn().mockImplementation(async () => {
                throw new Error('Error 1');
            });
            const task2 = jest.fn().mockImplementation(async () => {
                throw new Error('Error 2');
            });
            const task3 = jest.fn().mockResolvedValue('success');

            queue.add(task1);
            queue.add(task2);
            queue.add(task3);

            await queue.onIdle();

            expect(task1).toHaveBeenCalledTimes(1);
            expect(task2).toHaveBeenCalledTimes(1);
            expect(task3).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledTimes(2);
        });

        it('should handle rejected promises gracefully', async () => {
            const task1 = jest.fn().mockRejectedValue(new Error('Rejected task'));
            const task2 = jest.fn().mockResolvedValue('success');

            queue.add(task1);
            queue.add(task2);

            // This should not throw an error
            await expect(queue.onIdle()).resolves.not.toThrow();

            expect(task1).toHaveBeenCalledTimes(1);
            expect(task2).toHaveBeenCalledTimes(1);
        });

        it('should handle errors in startTaskFromQueue', async () => {
            const errorTask = jest.fn().mockImplementation(async () => {
                throw new Error('Task error');
            });
            const successTask = jest.fn().mockResolvedValue('success');

            // Add tasks that will trigger startTaskFromQueue with errors
            queue.add(errorTask);
            queue.add(successTask);

            await queue.onIdle();

            expect(errorTask).toHaveBeenCalledTimes(1);
            expect(successTask).toHaveBeenCalledTimes(1);
            expect(queue.getRunningTasks).toBe(0);
            expect(queue.getQueueLength).toBe(0);
        });
    });

    describe('task execution order', () => {
        it('should execute tasks in FIFO order when concurrency allows', async () => {
            const singleQueue = new CustomAsyncQueue({ concurrency: 1 });
            const executionOrder: number[] = [];

            const createTask = (id: number) => jest.fn().mockImplementation(async () => {
                executionOrder.push(id);
                await new Promise(resolve => setTimeout(resolve, 10));
                return `task${id}`;
            });

            const tasks = Array.from({ length: 4 }, (_, i) => createTask(i + 1));

            tasks.forEach(task => singleQueue.add(task));

            await singleQueue.onIdle();

            expect(executionOrder).toEqual([1, 2, 3, 4]);
            expect(singleQueue.getRunningTasks).toBe(0);
        });
    });

    describe('getters', () => {
        it('should provide access to internal state for testing', () => {
            expect(queue.getConcurrency).toBe(2);
            expect(queue.getRunningTasks).toBe(0);
            expect(queue.getQueueLength).toBe(0);
        });

        it('should update state correctly during task execution', async () => {
            const longTask = jest.fn().mockImplementation(() =>
                new Promise(resolve => setTimeout(resolve, 100))
            );

            queue.add(longTask);

            // Check state while task is running
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(queue.getRunningTasks).toBe(1);
            expect(queue.getQueueLength).toBe(0);

            await queue.onIdle();
            expect(queue.getRunningTasks).toBe(0);
        });
    });
});