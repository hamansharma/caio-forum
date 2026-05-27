import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ value, onChange }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={`search-bar ${value ? 'has-value' : ''}`}>
      <Search size={15} className="search-icon" />
      <input
        ref={ref}
        type="text"
        placeholder="Search posts… (⌘K)"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="search-input"
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}