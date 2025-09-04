// This file serves as the entry point for Vercel serverless deployment
// It imports and re-exports the default handler from the built NestJS application

module.exports = require('../dist/main.js').default;
