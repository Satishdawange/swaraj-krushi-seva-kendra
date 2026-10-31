import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function InventoryProductPicker({ inventory = [], value = '', onChange, placeholder, required = false, ariaLabel }) {
  const optionsId = `inventory-product-options-${useId().replace(/:/g, '')}`;
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [optionsPosition, setOptionsPosition] = useState(null);
  const matches = useMemo(() => {
    const query = String(value || '').trim().toLowerCase();
    const products = inventory.filter((item) => {
      if (!query) return true;
      return `${item.name || ''} ${item.nameEn || ''} ${item.category || ''} ${item.categoryEn || ''}`.toLowerCase().includes(query);
    });
    return products.slice(0, 80);
  }, [inventory, value]);

  const select = (product) => {
    onChange(product.name || product.nameEn || '');
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const input = inputRef.current;
      if (!input) return;

      const rect = input.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const spaceAbove = rect.top - 8;
      const spaceBelow = viewportHeight - rect.bottom - 8;
      const preferredMaxHeight = Math.min(280, viewportHeight - 16);
      const openAbove = spaceBelow < Math.min(preferredMaxHeight, 180) && spaceAbove > spaceBelow;
      const availableSpace = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(0, Math.min(preferredMaxHeight, availableSpace - 8));
      const width = Math.min(rect.width, viewportWidth - 16);

      setOptionsPosition({
        top: Math.max(8, openAbove ? rect.top - maxHeight - 3 : rect.bottom + 3),
        left: Math.max(8, Math.min(rect.left, viewportWidth - width - 8)),
        width,
        maxHeight
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const optionsStyle = optionsPosition
    ? {
        position: 'fixed',
        zIndex: 1200,
        top: optionsPosition.top,
        left: optionsPosition.left,
        width: optionsPosition.width,
        maxHeight: optionsPosition.maxHeight
      }
    : null;

  return (
    <div className="inventory-product-picker">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel || 'उत्पादनाचे नाव'}
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={optionsId}
        value={value}
        placeholder={placeholder || 'नाव शोधा किंवा टाइप करा'}
        onFocus={() => { setOpen(true); setActiveIndex(0); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open && matches[activeIndex]) {
            event.preventDefault();
            select(matches[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        required={required}
      />
      {open && optionsPosition && matches.length > 0 && createPortal(
        <div className="inventory-product-options" id={optionsId} role="listbox" style={optionsStyle}>
          {matches.map((product, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'inventory-product-option active' : 'inventory-product-option'}
              key={product.id || `${product.name}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(product)}
            >
              <span className="inventory-product-option-names">
                <strong>{product.name || product.nameEn || 'नाव नाही'}</strong>
                {product.nameEn && product.nameEn !== product.name && <small>{product.nameEn}</small>}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
      {open && optionsPosition && value && matches.length === 0 && createPortal(
        <div className="inventory-product-no-match" style={optionsStyle}>नवीन नाव म्हणून वापरा</div>,
        document.body
      )}
    </div>
  );
}