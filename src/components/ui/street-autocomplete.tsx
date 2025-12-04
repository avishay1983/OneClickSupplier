import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface StreetAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  city: string;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function StreetAutocomplete({
  value,
  onChange,
  city,
  placeholder = "שם הרחוב",
  id,
  className,
  disabled = false,
}: StreetAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchStreets = useCallback(async (query: string) => {
    if (!city || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-streets', {
        body: { city, query },
      });

      if (error) {
        console.error('Error searching streets:', error);
        setSuggestions([]);
      } else if (data?.streets) {
        setSuggestions(data.streets);
        setIsOpen(data.streets.length > 0);
      }
    } catch (err) {
      console.error('Failed to search streets:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [city]);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      searchStreets(inputValue);
    }, 300);
  };

  const handleSelect = (street: string) => {
    onChange(street);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={!city ? "בחר עיר תחילה" : placeholder}
          className={className}
          autoComplete="off"
          disabled={disabled || !city}
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {suggestions.map((street, index) => (
            <li
              key={index}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onClick={() => handleSelect(street)}
            >
              {street}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
