import React, { useId, useMemo, useState } from 'react';

export default function InventoryProductPicker({ inventory = [], value = '', onChange, placeholder, required = false, ariaLabel }) {
  const optionsId = `inventory-product-options-${useId().replace(/:/g, '')}`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
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

  return (
    <div className="inventory-product-picker">
      <input
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
      {open && matches.length > 0 && (
        <div className="inventory-product-options" id={optionsId} role="listbox">
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
        </div>
      )}
      {open && value && matches.length === 0 && <div className="inventory-product-no-match">नवीन नाव म्हणून वापरा</div>}
    </div>
  );
}