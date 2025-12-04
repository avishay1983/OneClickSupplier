import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { getBranchesByBank, BankBranch, formatBranchDisplay } from '@/data/bankBranches';
import { cn } from '@/lib/utils';

interface BranchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  bankName: string;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function BranchAutocomplete({
  value,
  onChange,
  bankName,
  placeholder = "מספר סניף",
  id,
  className,
}: BranchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<BankBranch[]>([]);
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

  const branches = getBranchesByBank(bankName);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (!bankName) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (inputValue.trim().length > 0) {
      const filtered = branches.filter(branch =>
        branch.code.includes(inputValue) || 
        branch.name.includes(inputValue) ||
        branch.city.includes(inputValue)
      );
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions(branches);
      setIsOpen(branches.length > 0);
    }
  };

  const handleFocus = () => {
    if (!bankName) return;
    
    if (!value.trim()) {
      setSuggestions(branches);
      setIsOpen(branches.length > 0);
    } else {
      const filtered = branches.filter(branch =>
        branch.code.includes(value) || 
        branch.name.includes(value) ||
        branch.city.includes(value)
      );
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    }
  };

  const handleSelect = (branch: BankBranch) => {
    onChange(branch.code);
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
        placeholder={!bankName ? "בחר בנק תחילה" : placeholder}
        className={cn("ltr text-right", className)}
        autoComplete="off"
        disabled={!bankName}
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {suggestions.map((branch, index) => (
            <li
              key={index}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-right"
              )}
              onClick={() => handleSelect(branch)}
            >
              <span className="font-medium">{branch.code}</span>
              <span className="text-muted-foreground mr-2">- {branch.name}</span>
              <span className="text-xs text-muted-foreground">({branch.city})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
