/**
 * @fileoverview Jest configuration for LegacyAI Voice Agent System
 * @author LegacyAI Subagent Fleet
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */

module.exports = {
  // Use Node.js test environment
  testEnvironment: 'node',

  // Coverage directory
  coverageDirectory: 'coverage',

  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Module paths
  modulePaths: ['<rootDir>/src'],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true
};
