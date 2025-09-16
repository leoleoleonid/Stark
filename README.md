# TypeScript Exercise Project

This repository contains TypeScript exercises with implementations and tests.

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

## Running the Examples

### DMV License Plate Generator

To run the DMV license plate generator example:
   ```
   npm run start:dmvExercise
   ```
Inside `dmvExercise.ts` you will find inline comments and a manual example (`n = 1_000_005`) explaining step by step how the code works.


### QUEUE/ConcurrentFetcher example
To run the QUEUE example:
   ```
   npm run start:queueExercise
   ```
To run tests for QUEUE exercise

   ```
   npm test
   ```

In `queueExercise` there are two queue implementations:
- a custom queue (written without LLMs, only formatted).
- the same logic using [`p-queue`](https://github.com/sindresorhus/p-queue) which I often use in practice because it has minimal dependencies and avoids reinventing the wheel.

Tests were generated with ChatGPT but reviewed and verified by me.
