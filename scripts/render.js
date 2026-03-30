'use strict';

/**
 * Renders a typed data object returned by an enricher into a plain string.
 *
 * Supported types:
 *   list     — flat list of { name, description } items, padded columns
 *   tree     — root node + recursive children with ASCII connectors
 *   sections — grouped lists, each with a title header
 *
 * @param {object|null} data
 * @returns {string|null}
 */
function render(data) {
  if (!data) return null;
  if (data.type === 'list') return renderList(data.items);
  if (data.type === 'tree') return renderTree(data.root);
  if (data.type === 'sections') return renderSections(data.sections);
  return null;
}

function renderList(items) {
  if (!items || items.length === 0) return null;
  const maxLen = Math.max(...items.map(i => i.name.length));
  const pad = maxLen + 4;
  return items
    .map(({ name, description }) => `${name.padEnd(pad)}${description}`)
    .join('\n');
}

function renderTree(root) {
  if (!root) return null;
  const lines = [];
  lines.push(`${root.name.padEnd(12)}${root.description}`);
  appendChildren(root.children || [], '', lines);
  return lines.join('\n');
}

function appendChildren(children, prefix, lines) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isLast = i === children.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    lines.push(`${prefix}${connector}${child.name.padEnd(12)}${child.description}`);
    appendChildren(child.children || [], childPrefix, lines);
  }
}

function renderSections(sections) {
  if (!sections || sections.length === 0) return null;
  return sections
    .map(({ title, items }) => {
      const list = renderList(items);
      if (!list) return null;
      const indented = list.split('\n').map(l => `  ${l}`).join('\n');
      return `${title}\n${indented}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

module.exports = { render };
