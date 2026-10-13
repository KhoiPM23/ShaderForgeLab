import React, { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { setDiagnostics, lintGutter, Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Code2, Copy, Check, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import { ShaderDiagnostic } from '../renderer/types';
import { GLSL_SNIPPETS, GlslSnippet } from '../snippets/snippetsLibrary';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  onManualCompile: () => void;
  diagnostics: ShaderDiagnostic[];
  autoCompile: boolean;
  onToggleAutoCompile: () => void;
}

// Dedicated GLSL syntax highlight palette
const glslHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#f43f5e', fontWeight: '600' },
  { tag: tags.typeName, color: '#38bdf8' },
  { tag: tags.definition(tags.variableName), color: '#93c5fd' },
  { tag: tags.function(tags.variableName), color: '#818cf8' },
  { tag: tags.number, color: '#fbbf24' },
  { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.operator, color: '#f472b6' },
  { tag: tags.string, color: '#34d399' },
  { tag: tags.punctuation, color: '#94a3b8' },
]);

const editorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px',
      backgroundColor: '#090c10',
      color: '#e2e8f0',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      lineHeight: '1.65',
    },
    '.cm-content': {
      padding: '10px 0',
      caretColor: '#6366f1',
    },
    '.cm-gutters': {
      backgroundColor: '#07090d',
      color: '#475569',
      borderRight: '1px solid #1e293b',
      fontFamily: "'JetBrains Mono', monospace",
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1e293b',
      color: '#cbd5e1',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#6366f1',
      borderLeftWidth: '2px',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(99, 102, 241, 0.25) !important',
    },
    '.cm-lint-marker-error': {
      content: 'none',
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: '#f87171',
      marginLeft: '4px',
    },
    '.cm-lintRange-error': {
      backgroundImage: 'none',
      textDecoration: 'underline wavy #f87171',
    },
  },
  { dark: true }
);

function toCmDiagnostics(doc: EditorState['doc'], diags: ShaderDiagnostic[]): CmDiagnostic[] {
  return diags.map((d): CmDiagnostic => {
    const rawLine = Number.isFinite(d.line) ? Math.trunc(d.line) : 1;
    const rawCol = d.column && Number.isFinite(d.column) ? Math.trunc(d.column) : 1;
    const lineNo = Math.min(Math.max(rawLine, 1), doc.lines);
    const line = doc.line(lineNo);
    const col = Math.max(rawCol - 1, 0);
    const from = Math.min(line.from + col, line.to);
    return {
      from,
      to: line.to,
      severity: d.severity === 'warning' ? 'warning' : 'error',
      message: d.message,
    };
  });
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  onManualCompile,
  diagnostics,
  autoCompile,
  onToggleAutoCompile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [lineCount, setLineCount] = useState(1);
  const [showSnippets, setShowSnippets] = useState(false);

  const diagCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    const compileKeymap = keymap.of([
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: () => {
          onManualCompile();
          return true;
        },
      },
      {
        key: 'Ctrl-s',
        mac: 'Cmd-s',
        run: () => {
          onManualCompile();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        lintGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        compileKeymap,
        cpp(),
        syntaxHighlighting(glslHighlightStyle),
        editorTheme,
        diagCompartment.current.of([]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const nextCode = update.state.doc.toString();
            onChange(nextCode);
            setLineCount(update.state.doc.lines);
          }
          if (update.selectionSet) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            setCursorPos({
              line: line.number,
              col: pos - line.from + 1,
            });
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setLineCount(state.doc.lines);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (code !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
      setLineCount(view.state.doc.lines);
    }
  }, [code]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cmDiags = toCmDiagnostics(view.state.doc, diagnostics);
    view.dispatch(setDiagnostics(view.state, cmDiags));
  }, [diagnostics]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertSnippet = (snippet: GlslSnippet) => {
    const view = viewRef.current;
    if (!view) return;

    const insertText = `\n${snippet.code}\n`;
    const cursor = view.state.selection.main.head;

    view.dispatch({
      changes: { from: cursor, insert: insertText },
      selection: { anchor: cursor + insertText.length },
    });
    view.focus();
    setShowSnippets(false);
  };

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;

  return (
    <div className="editor-container">
      {/* Editor Sub-header */}
      <div className="editor-header">
        <div className="editor-header-left">
          <Code2 size={15} className="editor-icon" />
          <span className="editor-title">fragment.glsl</span>
          <span className="editor-lang-tag">CodeMirror 6</span>
        </div>

        <div className="editor-header-right">
          {/* Snippets Menu */}
          <div className="snippets-dropdown-wrapper">
            <button
              className="btn-ghost-sm"
              onClick={() => setShowSnippets((prev) => !prev)}
              title="Insert reusable GLSL snippet"
            >
              <Sparkles size={13} className="snippet-icon" />
              <span>Snippets</span>
              <ChevronDown size={11} />
            </button>

            {showSnippets && (
              <div className="snippets-menu">
                <div className="snippets-menu-header">Insert Snippet</div>
                {GLSL_SNIPPETS.map((snip) => (
                  <button
                    key={snip.id}
                    className="snippet-item"
                    onClick={() => insertSnippet(snip)}
                  >
                    <span className="snippet-name">{snip.name}</span>
                    <span className="snippet-desc">{snip.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="toggle-label" title="Recompile while typing (350ms debounce)">
            <input
              type="checkbox"
              checked={autoCompile}
              onChange={onToggleAutoCompile}
            />
            <span>Auto-compile</span>
          </label>

          <button className="btn-ghost-sm" onClick={handleCopy} title="Copy shader code">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* CodeMirror 6 Mount Point */}
      <div className="editor-workspace" ref={containerRef} />

      {/* Editor Footer Status Bar */}
      <div className="editor-footer">
        <div className="footer-left">
          <span className="footer-info">Lines: {lineCount}</span>
          <span className="footer-info">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
        </div>
        <div className="footer-right">
          {errorCount > 0 && (
            <span className="footer-error-count">
              <AlertCircle size={12} />
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="footer-hint">Ctrl+Enter to compile</span>
        </div>
      </div>
    </div>
  );
};
