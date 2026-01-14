import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
    value: string;
    label: string;
    searchTerms?: string; // Optional: extra string to search against (e.g. employee ID + name)
    description?: string; // Optional: secondary text
    statusColor?: string; // Optional: text color for specific status (e.g. green for completed)
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Select...",
    label,
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get selected option details
    const selectedOption = useMemo(() =>
        options.find(opt => opt.value === value),
        [options, value]
    );

    useEffect(() => {
        if (selectedOption && !isOpen) {
            setSearchQuery(selectedOption.label);
        } else if (!value && !isOpen) {
            setSearchQuery("");
        }
    }, [selectedOption, isOpen, value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset query to selected value on close if no new selection made
                if (selectedOption) {
                    setSearchQuery(selectedOption.label);
                } else {
                    setSearchQuery("");
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedOption]);

    // Filter options
    const filteredOptions = useMemo(() => {
        const query = (searchQuery || "").toLowerCase().trim();

        // [Fix] If query is empty OR query exactly matches the current selection's label, show ALL options.
        // This prevents filtering when the user just clicks to open the dropdown.
        if (!query) return options;
        if (selectedOption && searchQuery === selectedOption.label) return options;

        const results = options.filter(opt => {
            const labelMatch = (opt.label || "").toLowerCase().includes(query);
            const searchTermsMatch = opt.searchTerms ? opt.searchTerms.toLowerCase().includes(query) : false;
            return labelMatch || searchTermsMatch;
        });

        console.log(`[SearchableSelect] Query: "${query}", Total Options: ${options.length}, Results: ${results.length}`, results);
        return results;
    }, [options, searchQuery, selectedOption]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setSearchQuery("");
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-slate-700 font-semibold text-base mb-2">
                    {label}
                </label>
            )}

            <div
                className={`relative group cursor-text
                    ${disabled ? 'opacity-60 pointer-events-none' : ''}
                `}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(true);
                        // [Fix] Auto-select text for easier replacement
                        setTimeout(() => inputRef.current?.select(), 0);
                    }
                }}
            >
                {/* Input Field */}
                <div className={`
                    flex items-center w-full pl-4 pr-10 py-3.5 text-base 
                    border rounded-xl bg-gray-50 transition-all
                    ${isOpen
                        ? 'border-orange-500 ring-4 ring-orange-50/50 bg-white'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                `}>
                    <Search className={`w-4 h-4 mr-3 ${isOpen ? 'text-orange-500' : 'text-slate-400'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-transparent outline-none text-slate-700 placeholder-slate-400"
                        placeholder={placeholder}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        disabled={disabled}
                    />

                    {/* Actions: Clear or Chevron */}
                    <div className="absolute right-3 flex items-center gap-1">
                        {value && !disabled && (
                            <button
                                onClick={handleClear}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                        {filteredOptions.length > 0 ? (
                            <div className="py-2">
                                {filteredOptions.map((option, index) => (
                                    <div
                                        key={`${option.value}-${index}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelect(option.value);
                                        }}
                                        className={`
                                            px-4 py-3 cursor-pointer flex items-center justify-between transition-colors
                                            ${option.value === value ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className="flex flex-col overflow-hidden">
                                            <span className={`truncate font-medium ${option.statusColor || ''}`}>
                                                {option.label || `(No Label) - ${option.value}`}
                                            </span>
                                            {option.description && (
                                                <span className="text-xs text-slate-400 truncate">
                                                    {option.description}
                                                </span>
                                            )}
                                        </div>
                                        {option.value === value && (
                                            <Check className="w-4 h-4 text-orange-600 ml-2 flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-8 text-center text-slate-500 text-sm">
                                ไม่พบข้อมูล "{searchQuery}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
