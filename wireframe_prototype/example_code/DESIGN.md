---
name: Enterprise Core
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#414753'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#717784'
  outline-variant: '#c1c6d5'
  surface-tint: '#005eb2'
  primary: '#0058a7'
  on-primary: '#ffffff'
  primary-container: '#0070d2'
  on-primary-container: '#f3f5ff'
  inverse-primary: '#a7c8ff'
  secondary: '#005fac'
  on-secondary: '#ffffff'
  secondary-container: '#4fa0ff'
  on-secondary-container: '#003665'
  tertiary: '#923f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b85203'
  on-tertiary-container: '#fff3ee'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3b'
  on-primary-fixed-variant: '#004788'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004884'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68f'
  on-tertiary-fixed: '#331100'
  on-tertiary-fixed-variant: '#773200'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  code:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-page: 24px
  sidebar-width: 240px
  header-height: 56px
  tab-bar-height: 40px
---

## Brand & Style

This design system is engineered for high-performance enterprise environments where data density and clarity are paramount. It adopts a **Corporate / Modern** aesthetic, prioritizing functional utility over decorative flair. The system is designed to feel authoritative, reliable, and efficient, echoing the structured environments of Salesforce Lightning and ServiceNow.

The visual language emphasizes structure through precise alignment, consistent containment, and a logical information hierarchy. It aims to reduce cognitive load in complex ERP workflows by using a "neutral-first" approach, where color is reserved for action and status. The interface evokes a sense of professional calm, allowing users to navigate vast amounts of information without visual fatigue.

## Colors

The palette is centered around **Enterprise Blue**, a high-accessibility shade used for primary actions and navigation indicators. The neutral scale is expansive, providing various shades of gray to differentiate between background layers, borders, and text levels.

- **Primary:** Used for the most important actions, active states, and focus indicators.
- **Surface Neutrals:** Backgrounds use a light cool gray (`#F3F3F3`) to provide contrast against white container surfaces, creating a clear "layered" effect for data modules.
- **Semantic Colors:** Success, warning, and error colors are slightly desaturated to maintain professionalism while remaining distinct for rapid status identification in tables and dashboards.

## Typography

The system utilizes **Inter** for its exceptional legibility at small sizes and high x-height, which is critical for data-heavy tables. 

The scale is intentionally compact. **Body-md (14px)** is the standard for most interface text, while **Body-sm (13px)** is used for secondary data and dense list items. Labels use a semi-bold weight and slight letter spacing to ensure they are distinguishable even when small. For headlines, we avoid excessive scale to keep more content "above the fold" and visible within multi-tab views.

## Layout & Spacing

This design system uses a **Fixed-Fluid Hybrid** grid model. The global navigation (Sidebar) and Workspace Header remain fixed, while the primary content area uses a fluid grid to maximize the use of large enterprise monitors.

### Layout Principles:
- **Sidebar Navigation:** A 240px fixed-width left rail for top-level modules. It can be collapsed to a 64px icon-only state.
- **Multi-Tab Workspace:** Located directly below the global header, allowing users to toggle between different records or views without losing context.
- **Spacing Rhythm:** Based on a 4px baseline. Components use `sm (8px)` or `md (16px)` internal padding to maintain a dense but breathable feel.
- **Guttering:** 16px constant between cards or modules in a dashboard view.

## Elevation & Depth

To maintain a clean aesthetic, elevation is primarily communicated through **Tonal Layers** and **Subtle Outlines** rather than heavy shadows.

- **Level 0 (App Background):** `#F3F3F3` - The lowest layer.
- **Level 1 (Card/Container):** `#FFFFFF` with a 1px border (`#D8DDE6`). This is where most work happens.
- **Level 2 (Popovers/Dropdowns):** White background with a soft, 8px blur shadow (Opacity 10%) and a neutral border.
- **Level 3 (Modals):** High-contrast shadow (24px blur) to focus attention, accompanied by a semi-transparent dark overlay over the app background.

Structure is defined by borders rather than depth, ensuring the UI remains sharp and performant on various hardware.

## Shapes

The design system uses **Soft (0.25rem)** roundedness as the default. This "professional radius" provides a modern feel without the playfulness of fully rounded corners.

- **Buttons & Inputs:** 4px radius.
- **Cards & Modals:** 8px (rounded-lg) to distinguish large containers.
- **Tabs:** Top-rounded only (4px) to reinforce their connection to the content area below.
- **Badges/Status Chips:** Often use a slightly higher radius (12px) to differentiate them from interactive buttons.

## Components

### Buttons
Primary buttons use the Enterprise Blue background with white text. Secondary buttons use a neutral border with blue text. Ghost buttons are reserved for utility actions in toolbars. Standard height is 32px for high-density views.

### Input Fields
Inputs feature a 1px border (`#D8DDE6`). On focus, the border transitions to Enterprise Blue with a subtle 2px glow. Labels are always positioned above the field in `label-md` style.

### Data Tables
The core of the ERP experience. Headers are light gray (`#F9FAFB`) with `label-md` text. Rows have a fixed height of 40px for standard density and 32px for high-density. Hover states use a very subtle blue tint (`#F0F7FD`).

### Multi-Tab Bar
Tabs are horizontal, with the active tab featuring a 3px top border in Enterprise Blue and a white background to "merge" with the content container below. Inactive tabs are light gray.

### Sidebar
The sidebar uses a dark-themed or very light-neutral aesthetic to separate navigation from the work area. Active items are indicated by a vertical blue bar on the left edge.