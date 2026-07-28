// Configures Expo's native mocks for React Native component tests.
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/components/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
};
