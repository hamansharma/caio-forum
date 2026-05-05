import React, { useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link, Quote, Code, Minus } from 'lucide-react';
import './MarkdownEditor.css';

const TOOLS = [
  { icon: Bold, label: 'Bold', wrap: ['**', '**'], placeholder: 'bold text' },
  { icon: Italic, label: 'Italic', wrap: ['*', '*'], placeholder: 'italic text' },
  { icon: Code, label: 'Code', wrap: ['`', '`'], placeholder: 'code' },
  { icon: Quote, label: 'Quote', prefix: '> ', placeholder: 'quoted text' },
  { icon: List, label: 'Bullet list', prefix: '- ', placeholder: 'list item' },
  { icon: ListOrdered, label: 'Numbered list', prefix: '1. ', placeholder: 'list item' },
  { icon: Link, label: 'Link', wrap: ['[', '](url)'], placeholder: 'link text' },
  { icon: Minus, label: 'Divider', insert: '\n---\n' },
];

export default function MarkdownEditor({ value, onChange, placeholder, rows = 8 }) {
  const ref = useRef();

  const applyFormat = (tool) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || tool.placeholder || '';
    let newText, cursor;

    if (tool.insert) {
      newText = value.slice(0, start) + tool.insert + value.slice(end);
      cursor = start + tool.insert.length;
    } else if (tool.prefix) {
      newText = value.slice(0, start) + tool.prefix + selected + value.slice(end);
      cursor = start + tool.prefix.length + selected.length;
    } else if (tool.wrap) {
      const [before, after] = tool.wrap;
      newText = value.slice(0, start) + before + selected + after + value.slice(end);
      cursor = start + before.length + selected.length;
    }

    onChange(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        tool.wrap ? cursor : (start + (tool.prefix?.length || 0)),
        cursor
      );
    }, 0);
  };

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        {TOOLS.map(({ icon: Icon, label, ...rest }) => (
          <button
            key={label}
            type="button"
            title={label}
            className="md-tool-btn"
            onClick={() => applyFormat({ icon: Icon, label, ...rest })}>
            <Icon size={14} />
          </button>
        ))}
        <span className="md-hint">Markdown supported</span>
      </div>
      <textarea
        ref={ref}
        className="md-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}