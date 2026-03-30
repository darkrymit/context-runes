'use strict';

const fs = require('fs');
const path = require('path');
const { render } = require('./render');

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, '.context-runes', 'config.json');

let stdinData = '';
process.stdin.on('data', chunk => (stdinData += chunk));
process.stdin.on('end', () => {
  try {
    main(stdinData);
  } catch (err) {
    process.stderr.write(`[context-runes] Fatal: ${err.message}\n`);
    emit('');
  }
});

function main(raw) {
  let prompt = '';
  try {
    const input = JSON.parse(raw);
    prompt = input.prompt || '';
  } catch {
    // stdin not JSON or empty — no tokens to parse
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`[context-runes] Config unreadable: ${err.message}\n`);
    emit('');
    return;
  }

  const enricherMap = config.enrichers || {};
  const sections = [];

  // Matches $key or $key(arg1, arg2)
  // Group 1: key (e.g., "module")
  // Group 2: args string (e.g., "chat, engine") - optional
  const tokenRegex = /\$([\w-]+)(?:\(([^)]*)\))?/g;
  let match;

  while ((match = tokenRegex.exec(prompt)) !== null) {
    const key = match[1];
    const rawArgs = match[2] || '';

    // Split by comma, trim spaces, and remove empty strings
    const args = rawArgs
    .split(',')
    .map(arg => arg.trim())
    .filter(Boolean);

    const enricherPath = enricherMap[key];
    if (!enricherPath) continue;

    const resolvedPath = path.join(projectRoot, enricherPath);
    try {
      const enricher = require(resolvedPath);
      const content = render(enricher.generate(projectRoot, args));

      // Strip only leading/trailing blank lines — preserve internal indentation
      const trimmed = content && content.replace(/^(\r?\n)+|(\r?\n)+$/g, '');
      if (trimmed) {
        const tag = enricher.sectionTag || key;
        sections.push(`<${tag}>\n${trimmed}\n</${tag}>`);
      }
    } catch (err) {
      process.stderr.write(`[context-runes] Enricher "${key}" failed: ${err.message}\n`);
    }
  }

  emit(sections.join('\n\n'));
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  }));
}