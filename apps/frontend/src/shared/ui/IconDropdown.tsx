import React from "react";
import { ChevronDown, Circle } from "lucide-react";
import { IconRenderer } from "./IconRenderer";

interface DropdownIcon {
  provider_type: string;
  provider_key: string;
}

// 아이콘 포함 드롭다운 컴포넌트 (거래 등록 폼·자주 쓰는 거래 폼 공용)
export interface DropdownOption {
  id: number | string;
  label: string;
  sublabel?: string;
  iconId: number;
  group?: string;
  disabled?: boolean;
}

interface IconDropdownProps {
  options: DropdownOption[];
  value?: number | string;
  placeholder: string;
  onChange: (option: DropdownOption) => void;
  error?: string;
  iconMap: Map<number, DropdownIcon>;
  disabled?: boolean;
}

export const IconDropdown: React.FC<IconDropdownProps> = ({
  options,
  value,
  placeholder,
  onChange,
  error,
  iconMap,
  disabled
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const groups = Array.from(new Set(options.map((o) => o.group ?? ""))).filter(Boolean);
  const hasGroups = groups.length > 0;

  function renderIcon(iconId: number) {
    const icon = iconMap.get(iconId);
    if (!icon) return <Circle size={18} className="text-[var(--color-text-secondary)]" />;
    return (
      <IconRenderer
        providerType={icon.provider_type}
        providerKey={icon.provider_key}
        size={18}
        className="text-[var(--color-text-primary)]"
      />
    );
  }

  function renderOptions(items: DropdownOption[]) {
    return items.map((opt) => (
      <button
        key={opt.id}
        type="button"
        disabled={opt.disabled}
        onClick={() => {
          if (!opt.disabled) {
            onChange(opt);
            setOpen(false);
          }
        }}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
          opt.id === value
            ? "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
            : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
        } ${opt.disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
          {renderIcon(opt.iconId)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">{opt.label}</span>
          {opt.sublabel && (
            <span className="block text-xs text-[var(--color-text-secondary)]">{opt.sublabel}</span>
          )}
        </span>
        {opt.id === value && (
          <span className="text-xs font-semibold text-[var(--color-primary)]">✓</span>
        )}
      </button>
    ));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
          error
            ? "border-[var(--color-danger)]"
            : open
              ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]"
              : "border-[var(--color-border-primary)]"
        } bg-[var(--color-bg-input)] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {selected ? (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
              {renderIcon(selected.iconId)}
            </span>
            <span className="flex-1 text-sm text-[var(--color-text-primary)]">
              {selected.label}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-[var(--color-text-caption)]">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--color-text-secondary)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] py-1 shadow-lg">
          {hasGroups
            ? groups.map((group) => {
                const groupItems = options.filter((o) => o.group === group);
                return (
                  <div key={group}>
                    <p className="px-4 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                      {group}
                    </p>
                    {renderOptions(groupItems)}
                  </div>
                );
              })
            : renderOptions(options)}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
};
