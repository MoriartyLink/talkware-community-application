import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  children: string;
  compact?: boolean;
  className?: string;
}

export default function MarkdownContent({ children, compact = false, className = '' }: MarkdownContentProps) {
  return (
    <div className={`break-words text-white/60 ${className}`}>
      <ReactMarkdown components={{
        p: ({ children }) => <p className={compact ? '' : 'mb-4 last:mb-0'}>{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-white/90">{children}</strong>,
        em: ({ children }) => <em className="italic text-white/75">{children}</em>,
        ul: ({ children }) => <ul className="my-4 list-disc space-y-1.5 pl-6">{children}</ul>,
        ol: ({ children }) => <ol className="my-4 list-decimal space-y-1.5 pl-6">{children}</ol>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-2 hover:text-white">{children}</a>,
      }}>{children}</ReactMarkdown>
    </div>
  );
}
