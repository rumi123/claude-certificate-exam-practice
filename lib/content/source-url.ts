// Content may cite only Anthropic's own pages (docs, engineering posts, Academy, the exam guide),
// plus the official MCP specification, which Anthropic created.
const ANTHROPIC_DOMAINS = ['anthropic.com', 'claude.com', 'modelcontextprotocol.io'];
const ANTHROPIC_HOSTS = ['claude.ai', 'anthropic.skilljar.com'];
const GITHUB_HOSTS = ['github.com', 'www.github.com'];

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isAnthropicUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const host = u.hostname.toLowerCase();
  if (ANTHROPIC_HOSTS.includes(host)) return true;
  if (ANTHROPIC_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  if (GITHUB_HOSTS.includes(host)) return u.pathname.toLowerCase().startsWith('/anthropics/');
  return false;
}
