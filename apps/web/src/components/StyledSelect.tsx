'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  searchThreshold?: number;
  emptyText?: string;
}

export function StyledSelect({
  value,
  onChange,
  options,
  placeholder = 'انتخاب کنید...',
  className = '',
  size = 'md',
  disabled = false,
  searchThreshold = 7,
  emptyText = 'موردی یافت نشد'
}: StyledSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [visibleCount, setVisibleCount] = useState(50);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && options.length >= searchThreshold && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchQuery('');
      setVisibleCount(50);
      setFocusedIndex(-1);
    }
  }, [isOpen, options.length, searchThreshold]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [options, searchQuery]);

  const visibleOptions = filteredOptions.slice(0, visibleCount);
  const hasMore = filteredOptions.length > visibleCount;

  // Keyboard navigation & Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        e.preventDefault();
        onChange(filteredOptions[focusedIndex].value);
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, filteredOptions, onChange]);

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs rounded-xl min-h-[34px]',
    md: 'py-2 px-3.5 text-xs sm:text-sm rounded-2xl min-h-[42px]',
    lg: 'py-2.5 px-4 text-sm rounded-2xl min-h-[48px]'
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-right w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-white/95 border transition-all duration-200 outline-none select-none text-right ${
          sizeClasses[size]
        } ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}
          {selectedOption ? (
            <span className="font-semibold text-slate-900 truncate">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-slate-400 font-normal text-[11px] mr-1.5">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[200px] bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 backdrop-blur-lg overflow-hidden animate-fade-in text-right">
          {/* Optional Search Filter for Large Option Sets */}
          {options.length >= searchThreshold && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(50);
                    setFocusedIndex(-1);
                  }}
                  placeholder="جستجو در گزینه‌ها..."
                  className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setVisibleCount(50);
                    }}
                    className="absolute left-2.5 top-2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List with High-Volume Chunking */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                {emptyText}
              </div>
            ) : (
              <>
                {visibleOptions.map((opt: SelectOption, idx: number) => {
                  const isSelected = opt.value === value;
                  const isFocused = idx === focusedIndex;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl transition text-right cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : isFocused
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : 'text-slate-700 hover:bg-slate-100/80 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {opt.icon && (
                          <span className="flex-shrink-0 text-slate-400">{opt.icon}</span>
                        )}
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </button>
                  );
                })}

                {/* Large Set Progressive Loader */}
                {hasMore && (
                  <div className="p-2 text-center border-t border-slate-100 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisibleCount((prev) => prev + 50);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      نمایش ۵۰ مورد بیشتر (نمایش {visibleCount} از {filteredOptions.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
