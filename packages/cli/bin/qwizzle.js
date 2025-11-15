#!/usr/bin/env node

import('../src/index.js').then((module) => {
  module.run();
}).catch((error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});
