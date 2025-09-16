// Given an array of URLs and a MAX_CONCURRENCY integer, implement a
// function that will asynchronously fetch each URL, not requesting
// more than MAX_CONCURRENCY URLs at the same time. The URLs should be
// fetched as soon as possible. The function should return an array of
// responses for each URL.

import {ConcurrentFetcher} from "./ConcurrentFetcher";

async function main(): Promise<void> {
    console.log("Running concurrent URL fetching with p-queue");

    const urls = [
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://jsonplaceholder.typicode.com/posts/2',
        'https://jsonplaceholder.typicode.com/posts/4',
        'https://jsonplaceholder.typicode.com/posts/5'
    ];
    console.log('\n=== Testing with CustomQueue ===');
    const maxConcurrency = 2;

    console.log('\n=== Testing with PQueue ===');
    console.log(`Fetching ${urls.length} URLs with max concurrency of ${maxConcurrency}`);
    const startTime = Date.now();
    const concurrentFetcher = ConcurrentFetcher.createWithPQueue();

    const results = await concurrentFetcher.fetchUrlsConcurrently(urls);

    const endTime = Date.now();
    console.log(`\nCompleted all requests in ${endTime - startTime}ms`);
    console.log('\nResults:');
    results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.url} - Status: ${result.status} - Title: ${result.data.title}`);
    });

    console.log('\n=== Testing with CustomQueue ===');
    console.log(`Fetching ${urls.length} URLs with max concurrency of ${maxConcurrency}`);
    const startTimeCustom = Date.now();
    const concurrentFetcherCustom = ConcurrentFetcher.createWithCustomQueue();

    const resultsCustom = await concurrentFetcherCustom.fetchUrlsConcurrently(urls);

    const endTimeCustom = Date.now();
    console.log(`\nCompleted all requests in ${endTimeCustom - startTimeCustom}ms`);
    console.log('\nResults:');
    resultsCustom.forEach((result, index) => {
        console.log(`${index + 1}. ${result.url} - Status: ${result.status} - Title: ${result.data.title}`);
    });
}

main();