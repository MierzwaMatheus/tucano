import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FilterableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const FilterableSelect: React.FC<FilterableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!options || !Array.isArray(options)) {
      setFilteredOptions([]);
      return;
    }

    const filtered = options.filter(option => 
      option && option.toLowerCase().includes(filter.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [filter, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    if (option) {
      onChange(option);
      setFilter('');
      setIsOpen(false);
    }
  };

  const displayValue = isOpen ? filter : (value || '');

  const displayOptions = filteredOptions.includes('Todas')
    ? filteredOptions
    : ['Todas', ...filteredOptions];

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => setFilter(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full h-10 px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {displayOptions.map((option, idx) => (
            <li
              key={option}
              className="px-3 py-2 cursor-pointer hover:bg-accent"
              onClick={() => {
                setIsOpen(false);
                setFilter('');
                onChange(option);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FilterableSelect; 