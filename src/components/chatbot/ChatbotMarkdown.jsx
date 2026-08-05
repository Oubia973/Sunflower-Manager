import React from "react";
import { imgsfl, imgcoins, imggem } from "../../constants/images.js";
import { normalizeServerImageUrl } from "../../constants/images.js";

const CHATBOT_CURRENCY_ICONS = [
  { name: "FLOWER", img: imgsfl, iconOnly: true, priority: 100, title: "FLOWER" },
  { name: "SFL", img: imgsfl, iconOnly: true, priority: 100, title: "FLOWER" },
  { name: "Coins", img: imgcoins, iconOnly: true, priority: 100, title: "Coins" },
  { name: "Coin", img: imgcoins, iconOnly: true, priority: 100, title: "Coins" },
  { name: "Gems", img: imggem, iconOnly: true, priority: 100, title: "Gems" },
  { name: "Gem", img: imggem, iconOnly: true, priority: 100, title: "Gems" },
];

const currencyIconMap = new Map(CHATBOT_CURRENCY_ICONS.map((entry) => [entry.name.toLowerCase(), entry]));

function collapseCurrencySynonyms(text) {
  return String(text || "").replace(/\b(FLOWER|SFL)\b(?:\s*[/\\|,-]\s*\b(FLOWER|SFL)\b)+/gi, "FLOWER");
}

function renderTextWithItemIcons(text, role, keyPrefix) {
  const value = role === "assistant"
    ? collapseCurrencySynonyms(text).replace(/\\\[\[/g, "[[").replace(/\\\]\]/g, "]]")
    : String(text || "");
  if (!value || role !== "assistant") return value;
  const markerPattern = /\[\[item:((?:[^[\]]|\[[^\]]*)*)\]\]/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  let markerIndex = 0;
  while ((match = markerPattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push(value.slice(lastIndex, match.index));
    }
    const marker = String(match[1] || "").trim();
    const [rawName, rawSrc = "", rawFlags = ""] = marker.split("|");
    const name = (() => {
      try {
        return decodeURIComponent(rawName || "").trim();
      } catch {
        return String(rawName || "").trim();
      }
    })();
    if (!name || name.includes("[[item:")) {
      parts.push(name || marker);
      lastIndex = match.index + match[0].length;
      markerIndex += 1;
      continue;
    }
    const src = (() => {
      try {
        return decodeURIComponent(rawSrc || "").trim();
      } catch {
        return String(rawSrc || "").trim();
      }
    })();
    const flags = String(rawFlags || "").toLowerCase();
    const isIconOnly = flags.includes("icononly");
    const currencyItem = currencyIconMap.get(name.toLowerCase());
    const iconSrc = src || currencyItem?.img || "";
    if (iconSrc) {
      parts.push(
        <span className="chatbot-item-name" key={`${keyPrefix}-item-${markerIndex}-${name || marker}`}>
          <img src={normalizeServerImageUrl(iconSrc)} alt="" className="chatbot-item-icon" title={name || marker} />
          {isIconOnly || currencyItem?.iconOnly ? null : (name || marker)}
        </span>
      );
    } else {
      parts.push(name || marker);
    }
    lastIndex = match.index + match[0].length;
    markerIndex += 1;
  }
  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }
  return parts.length ? parts : value;
}

function renderInlineMarkdown(text, role, keyPrefix) {
  const inputText = String(text || "");
  if (!inputText) return null;
  
  // Handle <br> tags first
  const breakParts = inputText.split(/(<br\s*\/?>)/gi);
  if (breakParts.length > 1) {
    const renderedBreakParts = [];
    breakParts.forEach((part, partIndex) => {
      if (!part) return;
      if (/^<br\s*\/?>$/i.test(part)) {
        renderedBreakParts.push(<br key={`${keyPrefix}-br-${partIndex}`} />);
        return;
      }
      const rendered = renderInlineMarkdown(part, role, `${keyPrefix}-brpart-${partIndex}`);
      if (Array.isArray(rendered)) renderedBreakParts.push(...rendered);
      else if (rendered !== null && rendered !== undefined && rendered !== "") renderedBreakParts.push(rendered);
    });
    return renderedBreakParts;
  }
  
  // For non-assistant messages, just render item icons
  if (role !== "assistant") {
    return renderTextWithItemIcons(inputText, role, keyPrefix);
  }
  
  // For assistant messages, use a comprehensive regex that handles ALL inline Markdown.
  // Key fix: Use [\s\S]*? instead of [^*]+ to match ANY character (including asterisks)
  // between bold markers. This allows bold patterns to contain [[item:...]] markers.
  //
  // Example that now works: **Recommandation :** Plantez du **[[item:Pepper|...]]** (Piment)
  // The regex matches the SHORTEST span between ** markers (non-greedy *?).
  const parts = [];
  const tokenPattern = /(```[\s\S]*?```|`[^`]+`|\*\*[\s\S]*?\*\*|__[\s\S]*?__|\*[\s\S]*?\*|_[\s\S]*?_)/g;
  let lastIndex = 0;
  let match;
  let tokenIndex = 0;
  
  while ((match = tokenPattern.exec(inputText)) !== null) {
    // Add plain text before this token
    if (match.index > lastIndex) {
      const plain = inputText.slice(lastIndex, match.index);
      const rendered = renderTextWithItemIcons(plain, role, `${keyPrefix}-${tokenIndex}`);
      if (Array.isArray(rendered)) parts.push(...rendered);
      else if (rendered !== null && rendered !== undefined && rendered !== "") parts.push(rendered);
      tokenIndex += 1;
    }
    
    const token = match[0];
    
    // Handle code blocks (triple backtick)
    if (token.startsWith("```") && token.endsWith("```")) {
      const inner = token.slice(3, -3);
      parts.push(<pre className="chatbot-markdown-code" key={`${keyPrefix}-code-${tokenIndex}`}><code>{inner}</code></pre>);
    }
    // Handle inline code
    else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      parts.push(<code className="chatbot-inline-code" key={`${keyPrefix}-code-${tokenIndex}`}>{inner}</code>);
    }
    // Handle bold **...**
    else if (token.startsWith("**") && token.endsWith("**")) {
      const inner = token.slice(2, -2);
      parts.push(<strong key={`${keyPrefix}-bold-${tokenIndex}`}>{renderTextWithItemIcons(inner, role, `${keyPrefix}-bold-${tokenIndex}`)}</strong>);
    }
    // Handle bold __...__
    else if (token.startsWith("__") && token.endsWith("__")) {
      const inner = token.slice(2, -2);
      parts.push(<strong key={`${keyPrefix}-bold-${tokenIndex}`}>{renderTextWithItemIcons(inner, role, `${keyPrefix}-bold-${tokenIndex}`)}</strong>);
    }
    // Handle italic *...*
    else if (token.startsWith("*") && token.endsWith("*")) {
      const inner = token.slice(1, -1);
      parts.push(<em key={`${keyPrefix}-italic-${tokenIndex}`}>{renderTextWithItemIcons(inner, role, `${keyPrefix}-italic-${tokenIndex}`)}</em>);
    }
    // Handle italic _..._
    else if (token.startsWith("_") && token.endsWith("_")) {
      const inner = token.slice(1, -1);
      parts.push(<em key={`${keyPrefix}-italic-${tokenIndex}`}>{renderTextWithItemIcons(inner, role, `${keyPrefix}-italic-${tokenIndex}`)}</em>);
    }
    
    lastIndex = match.index + token.length;
    tokenIndex += 1;
  }
  
  // Add remaining plain text
  if (lastIndex < inputText.length) {
    const plain = inputText.slice(lastIndex);
    const rendered = renderTextWithItemIcons(plain, role, `${keyPrefix}-tail`);
    if (Array.isArray(rendered)) parts.push(...rendered);
    else if (rendered !== null && rendered !== undefined && rendered !== "") parts.push(rendered);
  }
  
  return parts.length > 0 ? parts : inputText;
}

function splitMarkdownTableRow(line) {
  const raw = String(line || "").trim();
  if (!raw.includes("|")) return [];
  const normalized = raw.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";
  let itemMarkerDepth = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const pair = normalized.slice(index, index + 2);
    if (pair === "[[") {
      itemMarkerDepth += 1;
      current += pair;
      index += 1;
      continue;
    }
    if (pair === "]]" && itemMarkerDepth > 0) {
      itemMarkerDepth -= 1;
      current += pair;
      index += 1;
      continue;
    }
    if (char === "|" && itemMarkerDepth === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function isMarkdownTableSeparator(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.includes("|")) return false;
  const cells = splitMarkdownTableRow(trimmed);
  if (cells.length < 2) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function renderMarkdownBlocks(content, role) {
  const text = String(content || "");
  if (!text) return "";
  if (role !== "assistant") return text;

  const lines = text.replace(/\r/g, "").split("\n");
  const blocks = [];
  let i = 0;
  let blockIndex = 0;

  const pushParagraph = (paragraphLines) => {
    const paragraphText = paragraphLines.join(" ").trim();
    if (!paragraphText) return;
    blocks.push(
      <div className="chatbot-markdown-paragraph" key={`p-${blockIndex}`}>
        {renderInlineMarkdown(paragraphText, role, `p-${blockIndex}`)}
      </div>
    );
    blockIndex += 1;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(<pre className="chatbot-markdown-code" key={`code-${blockIndex}`}><code>{codeLines.join("\n")}</code></pre>);
      blockIndex += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const HeadingTag = `h${level}`;
      blocks.push(
        <HeadingTag className={`chatbot-markdown-heading chatbot-markdown-heading-${level}`} key={`h-${blockIndex}`}>
          {renderInlineMarkdown(headingMatch[2], role, `h-${blockIndex}`)}
        </HeadingTag>
      );
      blockIndex += 1;
      i += 1;
      continue;
    }

    const nextNonEmptyLine = (() => {
      for (let lookahead = i + 1; lookahead < lines.length; lookahead += 1) {
        if (lines[lookahead].trim()) return lines[lookahead].trim();
      }
      return "";
    })();
    if (trimmed.includes("|") && isMarkdownTableSeparator(nextNonEmptyLine)) {
      const tableRows = [];
      let headerRow = splitMarkdownTableRow(trimmed);
      i += 2;
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current) break;
        if (!current.includes("|")) break;
        if (isMarkdownTableSeparator(current)) {
          i += 1;
          continue;
        }
        tableRows.push(splitMarkdownTableRow(current));
        i += 1;
      }
      const columnCount = Math.max(headerRow.length, ...tableRows.map((row) => row.length), 0);
      while (headerRow.length < columnCount) headerRow.push("");
      const normalizedRows = tableRows.map((row) => {
        const clone = [...row];
        while (clone.length < columnCount) clone.push("");
        return clone;
      });
      blocks.push(
        <div className="chatbot-markdown-table-wrap" key={`table-${blockIndex}`}>
          <table className="chatbot-markdown-table">
            <thead>
              <tr>{headerRow.map((cell, cellIndex) => <th key={`table-${blockIndex}-head-${cellIndex}`}>{renderInlineMarkdown(cell, role, `table-${blockIndex}-head-${cellIndex}`)}</th>)}</tr>
            </thead>
            <tbody>
              {normalizedRows.map((row, rowIndex) => (
                <tr key={`table-${blockIndex}-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => <td key={`table-${blockIndex}-row-${rowIndex}-${cellIndex}`}>{renderInlineMarkdown(cell, role, `table-${blockIndex}-row-${rowIndex}-${cellIndex}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      blockIndex += 1;
      continue;
    }

    if (/^(-|\*|\u2022)\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!/^(-|\*|\u2022)\s+/.test(current)) break;
        items.push(current.replace(/^(-|\*|\u2022)\s+/, ""));
        i += 1;
      }
      blocks.push(<ul className="chatbot-markdown-list" key={`ul-${blockIndex}`}>{items.map((item, itemIndex) => <li key={`ul-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item, role, `ul-${blockIndex}-${itemIndex}`)}</li>)}</ul>);
      blockIndex += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!/^\d+\.\s+/.test(current)) break;
        items.push(current.replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(<ol className="chatbot-markdown-list" key={`ol-${blockIndex}`}>{items.map((item, itemIndex) => <li key={`ol-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item, role, `ol-${blockIndex}-${itemIndex}`)}</li>)}</ol>);
      blockIndex += 1;
      continue;
    }

    const paragraphLines = [trimmed];
    i += 1;
    while (i < lines.length) {
      const nextTrimmed = lines[i].trim();
      if (!nextTrimmed) break;
      const followingNonEmptyLine = (() => {
        for (let lookahead = i + 1; lookahead < lines.length; lookahead += 1) {
          if (lines[lookahead].trim()) return lines[lookahead].trim();
        }
        return "";
      })();
      if (nextTrimmed.includes("|") && isMarkdownTableSeparator(followingNonEmptyLine)) break;
      if (nextTrimmed.startsWith("```") || /^(#{1,3})\s+/.test(nextTrimmed) || /^(-|\*|\u2022)\s+/.test(nextTrimmed) || /^\d+\.\s+/.test(nextTrimmed)) break;
      paragraphLines.push(nextTrimmed);
      i += 1;
    }
    pushParagraph(paragraphLines);
  }

  return blocks.length ? blocks : text;
}

export default function ChatbotMarkdown({ content, role }) {
  return renderMarkdownBlocks(content, role);
}
