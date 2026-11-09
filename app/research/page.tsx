import { Card } from '@/components/ui';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeTaskAnchors from '@/lib/content/rehype-task-anchors';
import { loadResearch, researchHeadings } from '@/lib/content/research';

export const dynamic = 'force-dynamic';

export default function ResearchPage() {
  const markdown = loadResearch();
  const headings = researchHeadings(markdown);
  return (
    <div className="lg:flex lg:gap-8">
      <nav
        aria-label="Research contents"
        className="mb-6 hidden lg:sticky lg:top-4 lg:w-64 lg:shrink-0 lg:block lg:self-start"
      >
        <Card as="div">
          <h2 className="text-sm font-semibold">Contents</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="text-accent hover:underline">
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </nav>
      <article className="research min-w-0 flex-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, rehypeTaskAnchors]}
          components={{
            a: ({ href, children }) =>
              href && /^https?:\/\//.test(href) ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              ) : (
                <a href={href}>{children}</a>
              ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
