import clsx from 'clsx';
import type { Components } from 'react-markdown';
import { isValidElement, type HTMLAttributes, type ReactNode } from 'react';
import CopyCodeBlock from '@/components/CopyCodeBlock';

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  node?: unknown;
  children?: ReactNode;
};

export function extractMarkdownText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (!node) {
    return '';
  }
  if (Array.isArray(node)) {
    return node.map(extractMarkdownText).join('');
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractMarkdownText(node.props.children);
  }
  return '';
}

export function extractCodeBlockFromPre(node: ReactNode): {
  code: string;
  className?: string;
} | null {
  const candidate = Array.isArray(node) ? node[0] : node;
  if (isValidElement<{ children?: ReactNode; className?: string }>(candidate)) {
    return {
      code: extractMarkdownText(candidate.props.children).replace(/\n$/, ''),
      className: candidate.props.className,
    };
  }
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return {
      code: String(candidate).replace(/\n$/, ''),
    };
  }
  return null;
}

export const markdownInlineCode: Components['code'] = (props) => {
  const { node, className, children, ...rest } = props as MarkdownCodeProps;
  return (
    <code
      className={clsx(
        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono',
        className
      )}
      {...rest}
    >
      {children}
    </code>
  );
};

export const markdownCodeBlockPre: Components['pre'] = ({
  children,
}) => {
  const block = extractCodeBlockFromPre(children);
  if (!block) {
    return null;
  }
  return <CopyCodeBlock code={block.code} className={block.className} />;
};
