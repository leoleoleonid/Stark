// Given an array of URLs and a MAX_CONCURRENCY integer, implement a
// function that will asynchronously fetch each URL, not requesting
// more than MAX_CONCURRENCY URLs at the same time. The URLs should be
// fetched as soon as possible. The function should return an array of
// responses for each URL.

import PQueue from 'p-queue';
import fetch from 'node-fetch';

export const fetchUrl = async (url: string) => {
    console.log(`Starting fetch for: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Completed fetch for: ${url}`);
    return { url, status: response.status, data };
}

// I use p-queue extensively in my work for managing concurrent operations
// It's excellent for controlling concurrency and provides great flexibility
export async function fetchUrlsConcurrently(urls: string[], maxConcurrency: number): Promise<any[]> {
    const results: any[] = []
    const queue = new PQueue({ concurrency: maxConcurrency });
    urls.map(url =>
        queue.add(async () => {
            try {
                const result = await fetchUrl(url);
                results.push(result);
            } catch (e) {
                console.error(e)
            }
        })
    )
    await queue.onIdle()
    console.log('DONE', results.length);
    return results
}


async function main(): Promise<void> {
  console.log("Running concurrent URL fetching with p-queue");

  const urls = [
    'https://jsonplaceholder.typicode.com/posts/1',
    'https://jsonplaceholder.typicode.com/posts/2',
    'https://broken.typicode.com/posts/3',
    'https://jsonplaceholder.typicode.com/posts/4',
    'https://jsonplaceholder.typicode.com/posts/5'
  ];

  const maxConcurrency = 2;

  try {
    console.log(`Fetching ${urls.length} URLs with max concurrency of ${maxConcurrency}`);
    const startTime = Date.now();

    const results = await fetchUrlsConcurrently(urls, maxConcurrency);

    const endTime = Date.now();
    console.log(`\nCompleted all requests in ${endTime - startTime}ms`);
    console.log('\nResults:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url} - Status: ${result.status} - Title: ${result.data.title}`);
    });
  } catch (error) {
    console.error('Error fetching URLs:', error);
  }
}

main();