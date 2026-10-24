import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcutBadge?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search items, SKU, brand...',
  shortcutBadge = 'F4',
  className = '',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    onChange(val);
  };

  const handleClear = () => {
    setInternalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-retail-muted">
        <Search size={15} />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-14 py-2 text-xs bg-retail-bg border border-retail-border rounded-full text-retail-text placeholder:text-retail-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white transition-all duration-150"
      />
      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
        {internalValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-retail-muted hover:text-retail-text hover:bg-black/5 transition-colors"
            title="Clear search"
          >
            <X size={13} />
          </button>
        ) : shortcutBadge ? (
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-retail-muted bg-white border border-retail-border rounded shadow-2xs select-none">
            {shortcutBadge}
          </kbd>
        ) : null}
      </div>
    </div>
  );
};
