import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const safeLink = (href) => /^https?:\/\//i.test(href ?? '')

// react-markdown does not render raw HTML by default, so model output cannot inject markup.
const components = {
  img: () => null, // never load remote images from model output
  a: ({ href, children }) => (safeLink(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2">{children}</a>
    : <span>{children}</span>),
  p: (p) => <p className="mb-3 last:mb-0" {...strip(p)} />,
  ul: ({ className, ...p }) => <ul className={`mb-3 space-y-1 last:mb-0 ${className?.includes('contains-task-list') ? 'list-none pl-0' : 'list-disc pl-5'}`} {...strip(p)} />,
  ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0" {...strip(p)} />,
  li: ({ className, ...p }) => <li className={className?.includes('task-list-item') ? 'flex items-start gap-2' : ''} {...strip(p)} />,
  input: (p) => <input {...strip(p)} disabled className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]" />,
  h1: (p) => <h3 className="mb-2 mt-4 font-display text-lg font-semibold first:mt-0" {...strip(p)} />,
  h2: (p) => <h3 className="mb-2 mt-4 font-display text-lg font-semibold first:mt-0" {...strip(p)} />,
  h3: (p) => <h4 className="mb-1.5 mt-3 font-semibold first:mt-0" {...strip(p)} />,
  strong: (p) => <strong className="font-semibold" {...strip(p)} />,
  blockquote: (p) => <blockquote className="mb-3 border-l-2 border-line pl-3 text-muted" {...strip(p)} />,
  code: ({ className, children, ...p }) => (className
    ? <code className={`${className} text-[0.85em]`} {...strip(p)}>{children}</code>
    : <code className="rounded bg-surface-2 px-1 py-0.5 text-[0.9em]" {...strip(p)}>{children}</code>),
  pre: (p) => <pre className="mb-3 overflow-x-auto rounded-ctl bg-surface-2 p-3 text-sm" {...strip(p)} />,
  table: (p) => <div className="mb-3 overflow-x-auto"><table className="w-full min-w-max text-left text-sm" {...strip(p)} /></div>,
  th: (p) => <th className="border-b border-line px-2 py-1.5 font-medium" {...strip(p)} />,
  td: (p) => <td className="border-b border-line px-2 py-1.5" {...strip(p)} />,
}
function strip({ node, ordered, ...rest }) { return rest } // eslint-disable-line no-unused-vars

export default function Markdown({ children }) {
  return <div className="text-[15px] leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown></div>
}
