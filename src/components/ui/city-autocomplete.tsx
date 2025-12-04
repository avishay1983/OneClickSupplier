import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ISRAEL_CITIES } from '@/data/israelCities';
import { cn } from '@/lib/utils';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "עיר",
  id,
  className,
}: CityAutocompleteProps) {
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
      const filtered = ISRAEL_CITIES.filter(city =>
        city.includes(inputValue)
      ).slice(0, 8);
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (city: string) => {
    onChange(city);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {suggestions.map((city, index) => (
            <li
              key={index}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onClick={() => handleSelect(city)}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
