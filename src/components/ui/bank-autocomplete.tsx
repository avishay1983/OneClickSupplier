import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { BANK_NAMES } from '@/data/israelBanks';
import { cn } from '@/lib/utils';

interface BankAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function BankAutocomplete({
  value,
  onChange,
  placeholder = "שם הבנק",
  id,
  className,
}: BankAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.trim().length > 0) {
      const filtered = BANK_NAMES.filter(bank =>
        bank.includes(inputValue)
      );
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      // Show all banks when input is empty but focused
      setSuggestions(BANK_NAMES);
      setIsOpen(true);
    }
  };

  const handleFocus = () => {
    if (!value.trim()) {
      setSuggestions(BANK_NAMES);
      setIsOpen(true);
    } else {
      const filtered = BANK_NAMES.filter(bank => bank.includes(value));
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    }
  };

  const handleSelect = (bank: string) => {
    onChange(bank);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {suggestions.map((bank, index) => (
            <li
              key={index}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onClick={() => handleSelect(bank)}
            >
              {bank}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
