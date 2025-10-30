module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Module name mapping for CSS and asset files
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  // Module paths
  modulePaths: ['<rootDir>/src'],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // File extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }],
    '^.+\\.css$': '<rootDir>/tests/__mocks__/cssTransform.js',
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '<rootDir>/tests/__mocks__/fileTransform.js'
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@azure/msal-browser|@azure/msal-react)/)'
  ],

  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/tests/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/setupTests.ts',
    '!src/reportWebVitals.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}'
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

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Error on deprecated features
  errorOnDeprecated: true,

  // Notify mode
  notify: false,

  // Notify on failure only
  notifyMode: 'failure-change',

  // Max workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Globals
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Mock configuration
  mocks: {
    '@azure/msal-browser': '<rootDir>/tests/__mocks__/@azure/msal-browser.js',
    '@azure/msal-react': '<rootDir>/tests/__mocks__/@azure/msal-react.js',
    '@azure/cosmos': '<rootDir>/tests/__mocks__/@azure/cosmos.js'
  },

  // Snapshot serializers
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],

  // Force exit
  forceExit: false,

  // Detect open handles
  detectOpenHandles: true,

  // Detect leaked timers
  detectLeaks: false,

  // Run tests in band
  runInBand: false,

  // Max concurrent tests
  max