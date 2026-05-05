---
name: Kinetic Engineering Console
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424656'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#006970'
  on-secondary: '#ffffff'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#a33200'
  on-tertiary: '#ffffff'
  tertiary-container: '#cc4204'
  on-tertiary-container: '#fff6f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832600'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is built for the modern engineer—someone who demands high-velocity tools that feel as sophisticated as the code they write. The brand personality is **technical, precise, and visionary**. It avoids the clutter of legacy enterprise software in favor of a "Zen-like" focus, where the UI recedes to let the data and AI-driven insights take center stage.

The aesthetic merges **Minimalism** with **Glassmorphism**. We utilize ultra-clean layouts with significant whitespace, punctuated by translucent, frosted layers that suggest depth without adding bulk. The emotional response is one of "calm power": the interface feels fast and lightweight, yet possesses the premium finish of a luxury hardware product.

## Colors

The palette is anchored by a high-contrast relationship between a surgical white/cool gray background and a vibrant **Electric Blue** primary. 

- **Primary (#0066FF)**: Used for key actions and brand moments. It represents energy and precision.
- **Secondary (#00F0FF)**: A cyan-toned gradient partner to the primary, used sparingly for data visualizations and glass highlights.
- **Backgrounds**: The canvas is a layered experience. The base layer is **Ultra-light cool gray (#F8FAFC)**, while active floating elements use **Pure White (#FFFFFF)**.
- **Status Dots**: High-saturation greens, ambers, and reds are used as "pips" of light against the neutral backdrop to indicate system health without overwhelming the visual field.

## Typography

The typography system relies on **Inter** for its neutral, systematic clarity. To achieve the "Modern AI" look, we employ high contrast between weights. 

- **Headlines**: Large, bold, and tightly tracked. They should feel impactful and architectural.
- **Body**: Set with generous line-height to ensure readability during long debugging or monitoring sessions.
- **Labels**: Small, semibold, and often uppercased for meta-data and section headers to provide clear visual hierarchy.
- **Code/Technical Data**: We introduce **Space Grotesk** for monospaced strings, logs, and CLI outputs to maintain a futuristic, technical edge.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid Hybrid Grid**. Sidebars and utility panels are fixed width to maintain tool accessibility, while the main stage (The Console) is fluid. 

We use an **8px rhythm** (with 4px increments for tight UI components). Margins are generous to prevent the interface from feeling "cramped" or "legacy." Content should be grouped into logical modules with 24px gutters, creating a clear separation of concerns without the need for heavy physical borders.

## Elevation & Depth

This design system moves away from traditional drop shadows toward **Ambient Luminosity**.

- **Floating Cards**: Use a very soft, multi-layered shadow with a large blur (30px-40px) and low opacity (4-6%). This makes cards appear to hover effortlessly above the surface.
- **Glassmorphism**: Modals, popovers, and navigation overlays use a `backdrop-filter: blur(12px)` with a semi-transparent white fill (80% opacity). 
- **The "Inner Glow"**: Components often feature a subtle 1px white top-stroke (inner border) to simulate light catching the top edge of a physical object.
- **Depth Levels**:
  - `Level 0`: Background (#F8FAFC)
  - `Level 1`: Content Cards (White, No Border, Soft Shadow)
  - `Level 2`: Modals/Overlays (Glass Blur)

## Shapes

The shape language is defined by **Deep Rounded Corners**. A standard radius of **12px** is used for buttons and small inputs, while primary container cards use **16px**. This softness offsets the "coldness" of the technical data, making the engineering console feel approachable and modern. Pills (full radius) are reserved exclusively for status badges and tags.

## Components

- **Borderless Cards**: Containers must not have visible borders. Depth is created through soft shadows and subtle shifts in background color.
- **Vibrant Status Dots**: Use a 8px circle with an outer glow (box-shadow) of the same color to simulate an active LED.
- **Primary Buttons**: Solid Electric Blue (#0066FF) with white text. On hover, apply a subtle scale (1.02x) rather than a color shift to maintain the "premium" feel.
- **Glass Chips**: Metadata tags use a semi-transparent gray background with a 1px border that is only slightly darker than the tag fill.
- **Input Fields**: Ghost-style inputs that use a subtle #F1F5F9 background, transitioning to a white background with a 2px Electric Blue focus ring.
- **Data Viz**: Charts should utilize linear gradients (e.g., Electric Blue to Cyan) with smoothed line paths (Bezier) and hidden axes where possible to minimize visual noise.
- **AI Feedback**: Any AI-generated content should be encased in a card with a subtle "shimmer" border-gradient (Electric Blue to Transparent) to distinguish it from static system data.