# Design System Strategy: Institutional Precision & The Sovereign Ledger

## 1. Overview & Creative North Star
In the world of high-stakes cryptocurrency trading, visual noise is the enemy of execution. This design system is built upon the Creative North Star of **"The Sovereign Ledger."** 

Unlike retail-focused platforms that rely on "gamer" aesthetics—neon glows, pulses, and aggressive gradients—this system adopts an editorial, institutional approach. We are designing for the professional operative. The aesthetic is inspired by premium financial journals and high-end horology: it is authoritative, quiet, and deeply organized. 

We break the "template" look by utilizing intentional asymmetry in dashboard layouts, extreme typographic contrast between labels and data, and a physical sense of depth achieved through tonal layering rather than structural lines. The goal is a UI that feels less like software and more like a custom-machined instrument.

---

## 2. Colors & Surface Architecture
The palette is rooted in a deep, nocturnal navy to reduce eye strain during long sessions, punctuated by a "Professional Gold" that signifies value and action.

### The "No-Line" Rule
Standard UI relies on 1px borders to separate sections. In this system, **100% opaque lines are prohibited for sectioning.** Boundaries must be defined through background color shifts. A `surface-container-low` widget sitting on a `surface` background creates a natural, sophisticated edge that feels integrated rather than boxed in.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the Material tiers to create depth:
*   **Base Layer:** `surface` (#07151d) for the primary application background.
*   **Secondary Zones:** `surface-container-low` (#101d26) for navigation rails or sidebars.
*   **Active Workspaces:** `surface-container` (#14212a) for the main trading terminal panels.
*   **Prominent Overlays:** `surface-container-high` (#1f2c34) for active state cards or modals.

### The "Glass & Gradient" Rule
To move beyond a flat "template" feel, use **Glassmorphism** for floating elements (like dropdowns or hovering tooltips). Utilize the `surface-variant` color at 60% opacity with a `20px` backdrop blur. 
*   **Signature Polish:** For primary CTA buttons, use a subtle linear gradient from `primary` (#ffe2a8) to `primary-container` (#fcc010) at a 135-degree angle. This provides a "metallic" weight that flat yellow cannot achieve.

---

## 3. Typography: The Editorial Contrast
We use a dual-font strategy to separate human-readable narrative from machine-readable data.

*   **UI Narrative (Inter):** All labels, headers, and navigation items use Inter. It provides a modern, neutral voice. 
    *   *Editorial Note:* Use `display-lg` for portfolio totals to create a high-end "magazine" feel.
*   **The Truth (Monospace):** All prices, quantities, and timestamps must use a monospaced variant. This ensures that when numbers change, they do not "jump" (tabular figures), maintaining the visual stability required for institutional trading.

### Typography Scale
*   **Display (3.5rem - 2.25rem):** Reserved for high-level portfolio snapshots.
*   **Headline/Title (2rem - 1rem):** Used for panel titles. Always use `on-surface-variant` (#d3c5ac) to keep these secondary to the data.
*   **Label (0.75rem - 0.6875rem):** All-caps with 0.05em letter spacing for "Institutional Labels" (e.g., "MARKET CAP", "24H VOLUME").

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "dirty" (black on dark blue). We achieve lift through light, not shadow.

*   **The Layering Principle:** Stack `surface-container-lowest` cards on `surface-container-low` sections. This "negative depth" creates an inset look, making the data feel like it is etched into the dashboard.
*   **Ambient Shadows:** For floating modals, use a shadow with a 40px blur, 0% spread, and an 8% opacity. The color should be `surface-container-lowest`—this creates a "dark glow" that feels like a natural obstruction of light.
*   **The "Ghost Border" Fallback:** Where accessibility requires a border, use the **Ghost Border**: `outline-variant` (#4f4632) at 20% opacity. It should be barely felt, only perceived.

---

## 5. Components

### Buttons
*   **Primary:** Solid Gold (`primary-container`). No border. 4px radius. Label in `on-primary` (#3f2e00).
*   **Secondary:** Ghost style. `outline` border at 30% opacity. Text in `primary`.
*   **Semantic (Buy/Sell):** Solid `#00C805` (Buy) and `#FF3B30` (Sell). Use these sparingly; only for the final execution action.

### Input Fields
*   **The "Inset" Style:** Avoid the "four-sided box." Use a `surface-container-lowest` background with a 1px bottom-border of `primary-fixed-dim` at 40% opacity. This feels more like a professional ledger entry.

### Cards & Trading Lists
*   **Zero-Divider Policy:** Do not use horizontal lines between list items. Use 12px of vertical white space and a subtle hover state shift to `surface-bright`.
*   **Data Density:** Lists should be compact. Use `label-md` for headers and `body-sm` (Monospace) for list content to maximize information density without clutter.

### Specialty: The "Ticker Tape"
For scrolling price feeds, use a `surface-container-lowest` background with no borders. Use `tertiary` (#b6efff) for neutral price movements to distinguish from the high-priority Gold primary accent.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Align high-level stats to the left and tactical controls to the right. Use the empty space to let the "Sovereign Ledger" breathe.
*   **Prioritize Monospace:** If it's a number, it's Monospaced. No exceptions.
*   **Use Micro-Interactions:** Transitions between surface colors should be 150ms linear—fast and "mechanical."

### Don’t:
*   **No Neon/Glows:** Never use outer glows or drop shadows on text. It cheapens the institutional feel.
*   **No Standard Grids:** Avoid the "3x3 grid" look. Vary panel widths (e.g., 25% sidebar, 50% chart, 25% order book) to create a custom layout.
*   **No Rounded Pills:** Keep corner radii between 4px and 8px. "Pill" shapes feel too consumer/mobile; sharp, slight radii feel like hardware.