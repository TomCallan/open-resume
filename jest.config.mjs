import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config = {
  testEnvironment: "jest-environment-jsdom",
  moduleDirectories: ["node_modules", "<rootDir>/src/app"],
  moduleNameMapper: {
    "^public/(.*)$": "<rootDir>/public/$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

export default createJestConfig(config);
