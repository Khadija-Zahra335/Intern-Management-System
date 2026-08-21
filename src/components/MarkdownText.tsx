import React from "react";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function MarkdownText({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList(key: string) {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={key} className="list-disc pl-5 space-y-1 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-foreground">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushList(`list-${idx}`);
      blocks.push(
        <h3 key={idx} className="text-base font-semibold text-foreground mt-4 mb-1 first:mt-0">
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith("### ")) {
      flushList(`list-${idx}`);
      blocks.push(
        <h4 key={idx} className="text-sm font-semibold text-foreground mt-3 mb-1">
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === "") {
      flushList(`list-${idx}`);
    } else {
      flushList(`list-${idx}`);
      blocks.push(
        <p key={idx} className="text-sm text-foreground leading-relaxed my-1">
          {renderInline(trimmed)}
        </p>
      );
    }
  });
  flushList("list-end");

  return <div>{blocks}</div>;
}

export function markdownPreview(text: string, maxLen = 140) {
  const stripped = text
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + "…" : stripped;
}