// Lightweight contenteditable rich text editor for recipe notes.
// Supports bold, italic, headings, bullet/numbered lists, and clean paste.
// Stores HTML; renders as HTML on display. Designed to be small and mobile-friendly.
import { useEffect, useRef, useState } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, Quote, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

function exec(command: string, value?: string) {
  // execCommand is deprecated but remains the simplest cross-platform
  // approach for a lightweight editor that doesn't need to ship hundreds
  // of KB of editor framework.
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your recipe notes…",
  className,
  minHeight = 160,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!value);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
      setEmpty(!ref.current.innerText.trim());
    }
  }, [value]);
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
      setEmpty(!ref.current.innerText.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [];

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    onChange(html);
    setEmpty(!ref.current.innerText.trim());
  };

  const apply = (cmd: string, val?: string) => {
    exec(cmd, val);
    ref.current?.focus();
    handleInput();
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-[#b7c6c2]/30 bg-[#eeebe3]/50 focus-within:border-cantaloupe transition-colors",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#b7c6c2]/20 bg-white/40 rounded-t-xl">
        <ToolButton onClick={() => apply("bold")} label="Bold">
          <Bold size={14} />
        </ToolButton>
        <ToolButton onClick={() => apply("italic")} label="Italic">
          <Italic size={14} />
        </ToolButton>
        <ToolButton onClick={() => apply("formatBlock", "H2")} label="Heading">
          <Heading2 size={14} />
        </ToolButton>
        <ToolButton onClick={() => apply("formatBlock", "BLOCKQUOTE")} label="Quote">
          <Quote size={14} />
        </ToolButton>
        <div className="w-px h-5 bg-[#b7c6c2]/30 mx-0.5" />
        <ToolButton
          onClick={() => apply("insertUnorderedList")}
          label="Bulleted list"
        >
          <List size={14} />
        </ToolButton>
        <ToolButton
          onClick={() => apply("insertOrderedList")}
          label="Numbered list"
        >
          <ListOrdered size={14} />
        </ToolButton>
        <div className="ml-auto">
          <ToolButton
            onClick={() => {
              if (ref.current) ref.current.innerHTML = "";
              handleInput();
            }}
            label="Clear"
          >
            <Eraser size={14} />
          </ToolButton>
        </div>
      </div>

      {/* Editable area */}
      <div className="relative">
        {empty && (
          <div
            className="absolute top-3 left-4 text-sm text-[#b7c6c2] pointer-events-none select-none"
            aria-hidden
          >
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          className={cn(
            "px-4 py-3 text-sm text-[#171e19] outline-none overflow-y-auto",
            "prose prose-sm max-w-none",
            "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_blockquote]:border-l-2 [&_blockquote]:border-cantaloupe [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#b7c6c2]",
            "[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic",
          )}
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

function ToolButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded-md flex items-center justify-center text-[#171e19]/70 hover:bg-white hover:text-[#171e19] active:scale-90 transition"
    >
      {children}
    </button>
  );
}

export function RichContentView({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html || !html.replace(/<[^>]+>/g, "").trim()) {
    return (
      <p className="text-sm italic text-[#b7c6c2]">
        No notes yet.
      </p>
    );
  }
  return (
    <div
      className={cn(
        "text-sm text-[#171e19] leading-relaxed",
        "prose prose-sm max-w-none",
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-cantaloupe [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#b7c6c2]",
        "[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic",
        "[&_p]:my-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
