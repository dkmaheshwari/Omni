// jest.config.js - Backend testing configuration
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test files
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // Coverage configuration
  collectCoverage: false, // Enable only when running coverage
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!test/**',
    '!server.js' // Exclude main server file from coverage
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Higher thresholds for critical security functions
    './utils/inputSanitizer.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './utils/aiDecisionEngine.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // MongoDB Memory Server setup
  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js'
};