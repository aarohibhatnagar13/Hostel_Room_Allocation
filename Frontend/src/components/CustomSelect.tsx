import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: React.ReactNode }[];
    className?: string;
    dropdownClassName?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, className, dropdownClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between outline-none transition-all ${className || ''}`}
            >
                <span className="truncate pr-4">{selectedOption?.label}</span>
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isOpen && (
                <div className={`absolute left-0 right-0 top-[105%] bg-white border-2 border-gray-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar z-50 ${dropdownClassName || ''}`}>
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`w-full text-left px-5 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors ${value === opt.value ? 'bg-blue-50/50 font-black text-[#005a9c]' : 'font-bold text-gray-700'}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
