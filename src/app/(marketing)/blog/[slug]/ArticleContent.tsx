"use client";

import { motion } from "framer-motion";

interface ArticleContentProps {
  content: string;
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").trim();
      if (text) {
        elements.push(
          <p key={key++} className="text-text-secondary leading-relaxed">
            {renderInline(text)}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  function renderInline(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-text-primary">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h2
          key={key++}
          className="mt-10 mb-4 text-2xl font-bold text-text-primary"
        >
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("- ")) {
      flushParagraph();
      elements.push(
        <li
          key={key++}
          className="ml-4 flex items-start gap-3 text-text-secondary"
        >
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
          <span>{renderInline(trimmed.slice(2))}</span>
        </li>
      );
    } else if (trimmed === "") {
      flushParagraph();
    } else {
      currentParagraph.push(trimmed);
    }
  }

  flushParagraph();
  return elements;
}

export default function ArticleContent({ content }: ArticleContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="prose-dark space-y-4"
    >
      {renderContent(content)}
    </motion.div>
  );
}
