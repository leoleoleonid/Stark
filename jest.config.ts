import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    testRegex: '.*\\.test\\.ts$',
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: { '^.+\\.(t|j)s$': 'ts-jest' }
};

export default config;
