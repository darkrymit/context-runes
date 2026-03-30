'use strict';

/**
 * CLI interface for prompt enrichers.
 *
 * Usage:
 * node query.js <key> [arg1 arg2 ...]
 *
 * Examples:
 * node query.js m
 * node query.js m chat
 * node query.js m chat engine
 * node query.js kb
 * node query.js kb f
 * node query.js kb f login
 *
 * Exits with code 1 and prints to stderr on error.
 */

const fs = require('fs');
const path = require('path');
const { render } = require('./render');

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, '.context-runes', 'config.json');

const [, , key, ...args] = process.argv;

if (!key) {
  process.stderr.write('Usage: node query.js <key> [arg1 arg2 ...]\n');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  process.stderr.write(`[query] Config unreadable: ${err.message}\n`);
  process.exit(1);
}

const enricherPath = (config.enrichers || {})[key];
if (!enricherPath) {
  process.stderr.write(`[query] Unknown key: "${key}". Available: ${Object.keys(config.enrichers || {}).join(', ')}\n`);
  process.exit(1);
}

const resolvedPath = path.join(projectRoot, enricherPath);
try {
  const enricher = require(resolvedPath);
  const content = render(enricher.generate(projectRoot, args));
  if (content) {
    process.stdout.write(content + '\n');
  }
} catch (err) {
  process.stderr.write(`[query] Enricher failed: ${err.message}\n`);
  process.exit(1);
}