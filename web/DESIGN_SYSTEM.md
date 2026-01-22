# VolleyBratansStream Design System

This document describes the **Moneyball Enterprise Design System** as implemented in `styles.css`.

---

## Design Tokens

### Color Palette (Slate/Zinc)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-app` | `#020617` | Main app background (Slate 950) |
| `--bg-surface` | `#0f172a` | Cards, panels (Slate 900) |
| `--bg-surface-hover` | `#1e293b` | Hover states (Slate 800) |
| `--bg-element` | `#1e293b` | Nested elements (Slate 800) |
| `--border` | `#1e293b` | Default borders |
| `--border-hover` | `#334155` | Hover borders |
| `--text-main` | `#f8fafc` | Primary text (Slate 50) |
| `--text-secondary` | `#cbd5e1` | Secondary text (Slate 300) |
| `--text-muted` | `#64748b` | Muted text (Slate 500) |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#3b82f6` | Primary actions (Blue 500) |
| `--primary-hover` | `#2563eb` | Primary hover (Blue 600) |
| `--success` | `#10b981` | Success states (Emerald 500) |
| `--warning` | `#f59e0b` | Warning states (Amber 500) |
| `--error` | `#ef4444` | Error states (Red 500) |

### Spacing

| Token | Value |
|-------|-------|
| `--space-xs` | `0.25rem` (4px) |
| `--space-sm` | `0.5rem` (8px) |
| `--space-md` | `1rem` (16px) |
| `--space-lg` | `1.5rem` (24px) |
| `--space-xl` | `2rem` (32px) |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small elements |
| `--radius-md` | `6px` | Buttons, inputs |
| `--radius-lg` | `8px` | Cards, modals |
| `--radius-full` | `9999px` | Pills, avatars |

---

## Icon System

### Global SVG Containment

All SVG elements within interactive components are automatically constrained to prevent uncontrolled expansion. This is applied via a defensive CSS layer.

**Affected elements:**
- `button svg`
- `a svg`
- `.btn svg`
- `.card svg:not(.card-illustration)`
- `[class*="action"] svg`
- `[class*="btn"] svg`

### Icon Size Scale

Use these utility classes to set explicit icon sizes:

| Class | Size | Use Case |
|-------|------|----------|
| `.icon-2xs` | 12px | Badges, dense tags |
| `.icon-xs` | 14px | Dense UI, table cells |
| `.icon-sm` | 16px | Default button icons |
| `.icon-md` | 20px | Card headers |
| `.icon-lg` | 24px | Section headers |
| `.icon-xl` | 32px | Empty states |
| `.icon-2xl` | 48px | Hero sections |

**Usage:**
```html
<span class="icon-sm">
    <svg>...</svg>
</span>
```

### Legacy Classes (Preserved)

| Class | Size |
|-------|------|
| `.icon` | 20px |
| `.icon-sm` | 16px |
| `.icon-lg` | 32px |

---

## Component Templates

### Button Base (`.btn-base`)

A standardized button foundation with proper icon alignment.

```css
.btn-base {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
}
```

**Button variants:**
- `.btn-primary` - Primary action (blue background)
- `.btn-secondary` - Secondary action (transparent with border)
- `.btn-danger` - Destructive action (error styling)
- `.btn-ghost` - Minimal hover-only styling

### Card Base (`.card-base`)

A standardized card foundation.

```css
.card-base {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
}
```

---

## Scout System Specifics

The Scout System has explicit SVG constraints:

| Selector | Icon Size |
|----------|-----------|
| `.scout-btn-action svg` | 16px |
| `.scout-btn-secondary svg` | 16px |
| `.scout-player-delete svg` | 14px |
| `.scout-legend svg` | 16px |
| `.scout-empty-state > svg` | 48px |

---

## Verification

Run this in the browser console to detect oversized SVGs:

```javascript
document.querySelectorAll('svg').forEach(svg => {
    const rect = svg.getBoundingClientRect();
    if (rect.width > 100 || rect.height > 100) {
        console.warn('Oversized SVG:', svg, rect.width, rect.height);
    }
});
```

All icons should render at their intended dimensions with zero console warnings.
