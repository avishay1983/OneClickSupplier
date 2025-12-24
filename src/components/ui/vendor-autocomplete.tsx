import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface VendorOption {
  id: string;
  vendor_name: string;
  vendor_email: string;
  handler_name: string | null;
  handler_email: string | null;
}

interface VendorAutocompleteProps {
  value: string;
  onChange: (vendorId: string, vendor: VendorOption | null) => void;
  vendors: VendorOption[];
  placeholder?: string;
  id?: string;
  className?: string;
}

export function VendorAutocomplete({
  value,
  onChange,
  vendors,
  placeholder = "הקלד שם ספק...",
  id,
  className,
}: VendorAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<VendorOption[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync input value with selected vendor
  useEffect(() => {
    if (value) {
      const selectedVendor = vendors.find(v => v.id === value);
      if (selectedVendor) {
        setInputValue(`${selectedVendor.vendor_name} (${selectedVendor.vendor_email})`);
      }
    } else {
      setInputValue('');
    }
  }, [value, vendors]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputVal: string) => {
    setInputValue(inputVal);
    // Clear selection when user types
    if (value) {
      onChange('', null);
    }
    
    if (inputVal.trim().length > 0) {
      const filtered = vendors.filter(vendor =>
        vendor.vendor_name.includes(inputVal) ||
        vendor.vendor_email.toLowerCase().includes(inputVal.toLowerCase())
      ).slice(0, 10);
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    if (inputValue.trim().length > 0) {
      const filtered = vendors.filter(vendor =>
        vendor.vendor_name.includes(inputValue) ||
        vendor.vendor_email.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 10);
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      // Show first 10 vendors when focused with empty input
      setSuggestions(vendors.slice(0, 10));
      setIsOpen(vendors.length > 0);
    }
  };

  const handleSelect = (vendor: VendorOption) => {
    onChange(vendor.id, vendor);
    setInputValue(`${vendor.vendor_name} (${vendor.vendor_email})`);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((vendor) => (
            <li
              key={vendor.id}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onClick={() => handleSelect(vendor)}
            >
              <div className="font-medium">{vendor.vendor_name}</div>
              <div className="text-xs text-muted-foreground">{vendor.vendor_email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
