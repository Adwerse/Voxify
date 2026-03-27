"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import styles from "./markdown-content.module.css";

type MarkdownContentProps = {
  readonly content: string;
  readonly className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={`${styles.markdown} ${className ?? ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
