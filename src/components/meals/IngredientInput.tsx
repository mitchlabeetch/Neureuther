// Smart ingredient input: typeahead suggestions pulled from the
// ingredient dictionary, plus keyboard / click handling. A row can have
// an optional quantity field.
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IngredientSuggestion } from "@/lib/store";

export interface IngredientRow {
  id: string;
  name: string;
  quantity: string;
}

interface IngredientInputProps {
  rows: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
  fetchSuggestions: (q: string) => Promise<IngredientSuggestion[]>;
  placeholder?: string;
  showQuantity?: boolean;
}

function emptyRow(): IngredientRow {
  return { id: crypto.randomUUID(), name: "", quantity: "" };
}

export function IngredientInput({
  rows,
  onChange,
  fetchSuggestions,
  placeholder = "e.g. Tomatoes",
  showQuantity = true,
}: IngredientInputProps) {
  const updateRow = (idx: number, next: IngredientRow) => {
    const updated = rows.slice();
    updated[idx] = next;
    onChange(updated);
  };
  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };
  const addRow = (idx?: number) => {
    const next = rows.slice();
    next.splice((idx ?? rows.length - 1) + 1, 0, emptyRow());
    onChange(next);
    queueMicrotask(() => {
      const last = next[(idx ?? rows.length - 1) + 1];
      if (last) focusInput(`ing-name-${last.id}`);
    });
  };
  const focusNext = (idx: number) => {
    if (idx === rows.length - 1) {
      addRow();
    } else {
      const next = rows[idx + 1];
      queueMicrotask(() => focusInput(`ing-name-${next.id}`));
    }
  };

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <IngredientRowEditor
          key={row.id}
          row={row}
          showQuantity={showQuantity}
          fetchSuggestions={fetchSuggestions}
          onUpdate={(next) => updateRow(idx, next)}
          onRemove={() => removeRow(idx)}
          onEnter={() => focusNext(idx)}
          placeholder={placeholder}
        />
      ))}
      {rows.length === 0 && (
        <button
          type="button"
          onClick={() => onChange([emptyRow()])}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 border border-dashed border-[#b7c6c2]/40 text-sm text-[#b7c6c2] hover:border-cantaloupe hover:text-cantaloupe active:scale-[0.99] transition"
        >
          <Plus size={14} /> Add ingredient
        </button>
      )}
      {rows.length > 0 && (
        <button
          type="button"
          onClick={() => addRow()}
          className="text-xs font-semibold text-cantaloupe flex items-center gap-1 hover:underline px-1"
        >
          <Plus size={12} /> Add another ingredient
        </button>
      )}
    </div>
  );
}

function focusInput(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  el?.focus();
}

interface IngredientRowEditorProps {
  row: IngredientRow;
  showQuantity: boolean;
  fetchSuggestions: (q: string) => Promise<IngredientSuggestion[]>;
  onUpdate: (next: IngredientRow) => void;
  onRemove: () => void;
  onEnter: () => void;
  placeholder: string;
}

function IngredientRowEditor({
  row,
  showQuantity,
  fetchSuggestions,
  onUpdate,
  onRemove,
  onEnter,
  placeholder,
}: IngredientRowEditorProps) {
  const [query, setQuery] = useState(row.name);
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query.trim()).then((s) => {
        setSuggestions(s.slice(0, 6));
        setHighlight(0);
      });
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pickSuggestion = (s: IngredientSuggestion) => {
    onUpdate({ ...row, name: s.name });
    setQuery(s.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={cn("flex items-center gap-2", showQuantity ? "" : "")}>
        <div className="flex-1 relative">
          <input
            id={`ing-name-${row.id}`}
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setOpen(true);
              onUpdate({ ...row, name: v });
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && suggestions.length) {
                e.preventDefault();
                setHighlight((h) => (h + 1) % suggestions.length);
              } else if (e.key === "ArrowUp" && suggestions.length) {
                e.preventDefault();
                setHighlight(
                  (h) => (h - 1 + suggestions.length) % suggestions.length,
                );
              } else if (e.key === "Enter") {
                if (suggestions.length && open) {
                  e.preventDefault();
                  pickSuggestion(suggestions[highlight]);
                } else {
                  e.preventDefault();
                  onEnter();
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-xl bg-[#eeebe3] border border-[#b7c6c2]/20 px-3 py-2 text-sm text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe transition"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-[#b7c6c2]/30 shadow-lg overflow-hidden animate-fade-in-up">
              {suggestions.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickSuggestion(s);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition",
                    i === highlight
                      ? "bg-[#FFF1E6] text-[#171e19]"
                      : "text-[#171e19] hover:bg-[#eeebe3]/50",
                  )}
                >
                  <span>{s.name}</span>
                  {s.useCount > 1 && (
                    <span className="text-[10px] font-semibold text-cantaloupe bg-[#FFF1E6] px-1.5 py-0.5 rounded-full">
                      ×{s.useCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {showQuantity && (
          <input
            value={row.quantity}
            onChange={(e) => onUpdate({ ...row, quantity: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter();
              }
            }}
            placeholder="qty"
            className="w-20 rounded-xl bg-[#eeebe3] border border-[#b7c6c2]/20 px-3 py-2 text-sm text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe transition"
          />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="w-11 h-11 rounded-full flex items-center justify-center text-muted-ink hover:text-[#ca0013] hover:bg-red-50 active:scale-90 transition"
          aria-label="Remove ingredient"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
