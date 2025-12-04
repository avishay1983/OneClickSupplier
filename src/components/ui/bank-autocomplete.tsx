import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ISRAEL_BANKS, IsraelBank } from '@/data/israelBanks';
import { cn } from '@/lib/utils';

interface BankAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

function formatBankDisplay(bank: IsraelBank): string {
  return `${bank.name} (${bank.code})`;
}

function getBankNameFromDisplay(display: string): string {
  // Extract bank name without the code
  const match = display.match(/^(.+)\s*\(\d+\)$/);
  return match ? match[1].trim() : display;
}

export function BankAutocomplete({
  value,
  onChange,
  placeholder = "שם הבנק",
  id,
  className,
}: BankAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<IsraelBank[]>([]);
  const [displayValue, setDisplayValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync display value with external value changes
  useEffect(() => {
    if (value) {
      const bank = ISRAEL_BANKS.find(b => b.name === value);
      setDisplayValue(bank ? formatBankDisplay(bank) : value);
    } else {
      setDisplayValue('');
    }
  }, [value]);

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
    setDisplayValue(inputValue);
    const searchValue = getBankNameFromDisplay(inputValue);
    
    if (inputValue.trim().length > 0) {
      const filtered = ISRAEL_BANKS.filter(bank =>
        bank.name.includes(searchValue) || bank.code.includes(searchValue)
      );
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions(ISRAEL_BANKS);
      setIsOpen(true);
    }
  };

  const handleFocus = () => {
    if (!displayValue.trim()) {
      setSuggestions(ISRAEL_BANKS);
      setIsOpen(true);
    } else {
      const searchValue = getBankNameFromDisplay(displayValue);
      const filtered = ISRAEL_BANKS.filter(bank => 
        bank.name.includes(searchValue) || bank.code.includes(searchValue)
      );
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    }
  };

  const handleSelect = (bank: IsraelBank) => {
    onChange(bank.name);
    setDisplayValue(formatBankDisplay(bank));
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={displayValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {suggestions.map((bank) => (
            <li
              key={bank.code}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onClick={() => handleSelect(bank)}
            >
              {formatBankDisplay(bank)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
