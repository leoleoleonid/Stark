import PQueue from 'p-queue-cjs';
import fetch from 'node-fetch';
import {CustomAsyncQueue, QueueInterface} from "./CustomAsyncQueue";

export interface FetchResponse {
    url: string;
    status: number;
    data: any;
}
export type UrlFetcher = (url: string) => Promise<FetchResponse>;

export const fetchUrl: UrlFetcher = async (url: string) => {
    console.log(`Starting fetch for: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Completed fetch for: ${url}`);
    return { url, status: response.status, data };
}

export class ConcurrentFetcher {
    private fetcher: UrlFetcher;
    private queue: QueueInterface;

    constructor(fetcher: UrlFetcher, queue: QueueInterface) {
        this.fetcher = fetcher;
        this.queue = queue;
    }

    static createWithPQueue(fetcher: UrlFetcher = fetchUrl, concurrency: number = 5): ConcurrentFetcher {
        const queue = new PQueue({ concurrency });
        return new ConcurrentFetcher(fetcher, queue);
    }

    static createWithCustomQueue(fetcher: UrlFetcher = fetchUrl, concurrency: number = 5): ConcurrentFetcher {
        const queue = new CustomAsyncQueue({ concurrency });
        return new ConcurrentFetcher(fetcher, queue);
    }

    async fetchUrlsConcurrently(urls: string[]): Promise<FetchResponse[]> {
        const results: FetchResponse[] = [];

        urls.map(url =>
            this.queue.add(async () => {
                try {
                    const result = await this.fetcher(url);
                    results.push(result);
                } catch (e) {
                    console.error(e);
                }
            })
        );

        await this.queue.onIdle();
        console.log('DONE', results.length);
        return results;
    }
}
