export interface QueueInterface {
    add(asyncFn: () => Promise<any>): void;
    onIdle(): Promise<void>;
}

export class CustomAsyncQueue implements QueueInterface {
    private runningTasks = 0;
    private queue: Array<() => Promise<void>> = [];
    private concurrency: number;

    constructor(settings: { concurrency: number }) {
        this.concurrency = settings.concurrency;
    }

    get getConcurrency(): number {
        return this.concurrency;
    }

    get getRunningTasks(): number {
        return this.runningTasks;
    }

    get getQueueLength(): number {
        return this.queue.length;
    }

    private startTaskFromQueue() {
        while (this.runningTasks < this.concurrency && this.queue.length > 0) {
            const taskToStart = this.queue.shift();
            if (taskToStart) {
                // execute task but don't await it to avoid blocking
                taskToStart().catch(error => {
                    console.error('Task execution error:', error);
                });
            }
        }
    }

    // We need this for event loop not to stack
    private zeroDelay() {
        return new Promise<void>(resolve => setTimeout(resolve, 0));
    }

    //CustomAsyncQueue works only with async tasks (Promises) !!!!!!!!
    add(asyncFn: () => Promise<any>) {
        const task = async () => {
            this.runningTasks++;
            try {
                await asyncFn();
            } catch (error) {
                console.error('Task error:', error);
            } finally {
                this.runningTasks--;
                this.startTaskFromQueue();
            }
        };

        this.queue.push(task);
        this.startTaskFromQueue();
    }

    async onIdle() {
        while (!(this.queue.length === 0 && this.runningTasks === 0)) {
            await this.zeroDelay();
        }
    }
}