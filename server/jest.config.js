/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/jestSetup.js"],
};
