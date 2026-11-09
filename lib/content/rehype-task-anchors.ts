import type { Element, Root, RootContent } from 'hast';

const TASK_RE = /^Task (\d)\.(\d):/;

function textOf(node: RootContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

function firstStrong(node: Element): Element | null {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'strong') return child;
    const inner = firstStrong(child);
    if (inner) return inner;
  }
  return null;
}

function walk(node: Root | Element): void {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'p') {
      const strong = firstStrong(child);
      const m = strong ? TASK_RE.exec(textOf(strong)) : null;
      if (m) child.properties = { ...child.properties, id: `task-${m[1]}-${m[2]}` };
    } else {
      walk(child);
    }
  }
}

export default function rehypeTaskAnchors() {
  return (tree: Root) => walk(tree);
}
