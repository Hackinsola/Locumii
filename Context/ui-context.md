# UI Context — Locumii

## Version 3: Clerk-Accurate Design Language

-----

## Design Philosophy

Locumii adopts the exact visual language of Clerk.com — the closest reference for this product’s aesthetic. The system is built on pure neutral blacks and whites with zero colour tint in backgrounds, borders, or grey text. Colour (teal brand, amber accent) is used exclusively for interactive elements, status states, and key financial moments. Everything else is black, white, or neutral grey.

The defining characteristics, extracted directly from the Clerk UI:

- **Pure black backgrounds** — dark surfaces are `#0A0A0A` to `#131313`. No teal tint, no warm tint. Pure neutral.
- **Pure neutral greys** — body text, borders, and muted text are fully desaturated. `#888888`, `#6B7280`, `#E5E5E5`. No teal contamination.
- **White-on-black primary button** — on dark surfaces, the primary CTA is white background with black/brand text. Not teal.
- **Ghost button** — dark background, white text, thin `rgba(255,255,255,0.12)` border.
- **Light sections are pure white** — `#FFFFFF` background, `#111111` primary text, `#6B7280` secondary. No off-white, no tinted backgrounds.
- **1px borders everywhere** — cards defined by `#1F1F1F` on dark, `#E5E5E5` on light. No shadows on cards.
- **Tight, heavy typography** — large bold headings with negative letter-spacing (`-2px` to `-3px` at display size). Big gap between heading weight and body weight.
- **Brand teal is reserved** — appears only on: primary buttons (light surface), active nav states, focus rings, links, and the verified badge. It does not appear in backgrounds or borders.

-----

## Color Tokens

### Brand Tokens

|Token Name                   |Hex      |Usage                                                               |
|-----------------------------|---------|--------------------------------------------------------------------|
|`--color-brand-primary`      |`#0B6E6E`|Primary buttons (light surface only), active nav, links, focus rings|
|`--color-brand-primary-hover`|`#095A5A`|Hover on teal buttons (light surface only)                          |
|`--color-brand-primary-light`|`#E6F4F4`|Teal button hover background, selected row tint                     |
|`--color-brand-primary-muted`|`#4A9A9A`|Highlighted words in dark-panel hero headings only                  |
|`--color-brand-accent`       |`#D4900A`|Naira amounts in earnings, bid-accepted badge, payout confirmation  |
|`--color-brand-accent-hover` |`#B87A08`|Hover on amber elements                                             |
|`--color-brand-accent-light` |`#FDF3DC`|Earnings card background (light surface)                            |

### Surface Tokens

|Token Name                  |Hex                  |Surface|Usage                                      |
|----------------------------|---------------------|-------|-------------------------------------------|
|`--surface-page`            |`#FFFFFF`            |Light  |Main app pages — dashboard, feed, forms    |
|`--surface-card`            |`#FFFFFF`            |Light  |All cards on light pages                   |
|`--surface-card-border`     |`#E5E5E5`            |Light  |`1px` border on every light-surface card   |
|`--surface-subtle`          |`#FAFAFA`            |Light  |Alternating rows, inset section backgrounds|
|`--surface-input`           |`#FFFFFF`            |Light  |Form field background                      |
|`--surface-input-border`    |`#D1D5DB`            |Light  |Default input border                       |
|`--surface-dark-page`       |`#0A0A0A`            |Dark   |Hero, feature sections, CTA — pure black   |
|`--surface-dark-card`       |`#111111`            |Dark   |Cards inside dark sections                 |
|`--surface-dark-card-border`|`#1F1F1F`            |Dark   |`1px` border on dark cards                 |
|`--surface-dark-subtle`     |`#0D0D0D`            |Dark   |Nested/inset panels inside dark sections   |
|`--surface-nav-dark`        |`rgba(10,10,10,0.85)`|Dark   |Sticky nav background with backdrop blur   |
|`--surface-nav-dark-border` |`#1A1A1A`            |Dark   |Nav bottom border on dark background       |

### Neutral Tokens — Fully Desaturated

These are pure greys with zero colour tint. This is the critical change from previous versions.

|Token Name           |Hex      |Usage                                          |
|---------------------|---------|-----------------------------------------------|
|`--color-neutral-950`|`#0A0A0A`|Darkest — matches dark page background         |
|`--color-neutral-900`|`#111111`|Primary headings and body text on light surface|
|`--color-neutral-800`|`#1F1F1F`|Dark card borders, strong dark text            |
|`--color-neutral-700`|`#374151`|Secondary body text on light surface           |
|`--color-neutral-600`|`#4B5563`|Tertiary text on light surface                 |
|`--color-neutral-500`|`#6B7280`|Placeholder text, metadata on light surface    |
|`--color-neutral-400`|`#9CA3AF`|Muted text on light surface                    |
|`--color-neutral-300`|`#888888`|Body text on dark surface (secondary)          |
|`--color-neutral-200`|`#E5E5E5`|Card borders on light surface, horizontal rules|
|`--color-neutral-150`|`#F0F0F0`|Very subtle dividers                           |
|`--color-neutral-100`|`#F4F4F5`|Table alternates, hover backgrounds            |
|`--color-neutral-50` |`#FAFAFA`|Lightest grey — subtle section tint            |
|`--color-neutral-0`  |`#FFFFFF`|Pure white — cards, modals, form fields        |


> **Critical rule:** No neutral token has any teal, blue, or warm tint. They are pure RGB greys (`R = G = B` or very close). Any teal-tinted grey from previous versions (`#607070`, `#8A9E9E`, `#B0C4C4`, etc.) is replaced by the neutral tokens above.

### Semantic Status Tokens

|Token Name                        |Hex      |Usage                                                 |
|----------------------------------|---------|------------------------------------------------------|
|`--color-status-success`          |`#16A34A`|Verified badge, shift completed, payment released     |
|`--color-status-success-light`    |`#F0FDF4`|Success alert background — light surface              |
|`--color-status-success-dark`     |`#052E16`|Success alert background — dark surface               |
|`--color-status-success-text-dark`|`#4ADE80`|Success text/badge on dark surface                    |
|`--color-status-warning`          |`#D97706`|Credential expiring, shift filling fast               |
|`--color-status-warning-light`    |`#FFFBEB`|Warning background — light surface                    |
|`--color-status-info`             |`#2563EB`|Pending review, informational banners                 |
|`--color-status-info-light`       |`#EFF6FF`|Info background — light surface                       |
|`--color-status-critical`         |`#DC2626`|Suspended account, payment failed, rejected credential|
|`--color-status-critical-light`   |`#FEF2F2`|Critical alert background — light surface             |
|`--color-status-critical-dark`    |`#450A0A`|Critical alert background — dark surface              |

### Shift Status Badge Tokens

|Token Name                      |Background|Label      |Text Color|
|--------------------------------|----------|-----------|----------|
|`--color-shift-open`            |`#F0FDF4` |Open       |`#16A34A` |
|`--color-shift-open-dark`       |`#052E16` |Open       |`#4ADE80` |
|`--color-shift-filled`          |`#EFF6FF` |Filled     |`#2563EB` |
|`--color-shift-filled-dark`     |`#0C1A3D` |Filled     |`#60A5FA` |
|`--color-shift-in-progress`     |`#FFFBEB` |In Progress|`#D97706` |
|`--color-shift-in-progress-dark`|`#1C0A00` |In Progress|`#D4900A` |
|`--color-shift-completed`       |`#F0FDF4` |Completed  |`#16A34A` |
|`--color-shift-cancelled`       |`#F4F4F5` |Cancelled  |`#6B7280` |
|`--color-shift-cancelled-dark`  |`#1A1A1A` |Cancelled  |`#888888` |

-----

## Typography

### Font Stack

|Role                   |Font      |Fallback                                              |Source                                                                |
|-----------------------|----------|------------------------------------------------------|----------------------------------------------------------------------|
|**UI / Interface**     |Geist     |`Inter, -apple-system, BlinkMacSystemFont, sans-serif`|`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700` |
|**Numeric / Monospace**|Geist Mono|`JetBrains Mono, Courier New, monospace`              |`https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700`|

Geist is Vercel’s typeface — the closest publicly available font to what Clerk uses. If Geist is unavailable, Inter is the fallback. Both share the same tight, neutral grotesque character. Load Inter via Google Fonts as the primary reliable option.

Font loading tag:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
```

### Type Scale

|Token              |Size  |Line Height|Weight|Letter Spacing|Usage                          |
|-------------------|------|-----------|------|--------------|-------------------------------|
|`--text-display-xl`|`64px`|`1.02`     |`700` |`-3px`        |Largest hero — homepage only   |
|`--text-display-lg`|`52px`|`1.04`     |`700` |`-2.5px`      |Hero headings on dark panels   |
|`--text-display`   |`40px`|`1.08`     |`700` |`-2px`        |Page hero headings             |
|`--text-heading-1` |`30px`|`1.15`     |`700` |`-1px`        |Section headings               |
|`--text-heading-2` |`22px`|`1.2`      |`600` |`-0.5px`      |Card headings, modal titles    |
|`--text-heading-3` |`18px`|`1.3`      |`600` |`-0.3px`      |Sub-section labels             |
|`--text-body-lg`   |`16px`|`1.65`     |`400` |`0`           |Primary body text              |
|`--text-body`      |`14px`|`1.65`     |`400` |`0`           |Secondary body, descriptions   |
|`--text-body-sm`   |`13px`|`1.55`     |`400` |`0`           |Metadata, dates, location      |
|`--text-label`     |`12px`|`1.4`      |`500` |`0.01em`      |Form labels, table headers     |
|`--text-caption`   |`11px`|`1.4`      |`500` |`0.02em`      |Badge text, chips              |
|`--text-overline`  |`11px`|`1.4`      |`600` |`0.08em`      |Section overlines — ALL CAPS   |
|`--text-amount`    |`28px`|`1.1`      |`700` |`-1px`        |Naira amounts — JetBrains Mono |
|`--text-amount-sm` |`16px`|`1.2`      |`600` |`-0.3px`      |Inline amounts — JetBrains Mono|

### Type Rules

- Minimum font weight: `400`. Never `300` or `200`.
- All heading sizes use negative letter-spacing. The larger the heading, the more negative. This is non-negotiable for the Clerk look.
- On dark surfaces: headings `#FFFFFF`, secondary body `#888888`, muted text `#6B7280`.
- On light surfaces: headings `#111111`, secondary body `#6B7280`, muted `#9CA3AF`.
- The ₦ symbol always uses the same font and weight as its number.
- Overlines always render ALL CAPS with `0.08em` letter-spacing.
- Max line length: `68ch` on mobile. Enforce with `max-width` on paragraphs.
- Gradient text on hero dark headings only: `background: linear-gradient(135deg, #FFFFFF 50%, #4A9A9A 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`

-----

## Border Radius Scale

Clerk uses moderate rounding — not sharp corners, not pill-shaped. The overall feel is refined, not playful.

|Token Name     |Value   |Usage                                |
|---------------|--------|-------------------------------------|
|`--radius-xs`  |`4px`   |Inline chips, tight status indicators|
|`--radius-sm`  |`6px`   |Input fields, small badges           |
|`--radius-md`  |`8px`   |Buttons, dropdowns, tooltips         |
|`--radius-lg`  |`12px`  |Cards — shift cards, profile cards   |
|`--radius-xl`  |`16px`  |Feature panels, large cards          |
|`--radius-2xl` |`24px`  |Modal containers, bottom sheets      |
|`--radius-full`|`9999px`|Pill badges, avatar circles, toggles |

-----

## Spacing Scale

|Token Name  |Value  |Usage                                    |
|------------|-------|-----------------------------------------|
|`--space-1` |`4px`  |Icon-to-label gap, tight internal padding|
|`--space-2` |`8px`  |Input vertical padding, badge padding    |
|`--space-3` |`12px` |Button vertical padding                  |
|`--space-4` |`16px` |Card internal padding, form field gap    |
|`--space-5` |`20px` |Gap between cards                        |
|`--space-6` |`24px` |Page horizontal padding (mobile)         |
|`--space-8` |`32px` |Card padding (desktop), modal padding    |
|`--space-10`|`40px` |Page horizontal padding (desktop)        |
|`--space-12`|`48px` |Gap between major content blocks         |
|`--space-16`|`64px` |Section vertical padding (mobile)        |
|`--space-20`|`80px` |Section vertical padding (desktop)       |
|`--space-28`|`112px`|Hero section vertical padding            |

-----

## Shadow and Border System

### The Rule

Cards = `1px` border. No shadow. Shadows only for floating elements (modals, dropdowns).

### Light Surface Cards

```css
background: #FFFFFF;
border: 1px solid #E5E5E5;
border-radius: 12px; /* --radius-lg */
```

Hover (shift cards only):

```css
border-color: #D1D5DB;
box-shadow: 0 1px 8px rgba(0,0,0,0.06);
```

### Dark Surface Cards

```css
background: #111111;
border: 1px solid #1F1F1F;
border-radius: 12px;
```

### Shadow Tokens

|Token                |Value                                                   |Usage                                 |
|---------------------|--------------------------------------------------------|--------------------------------------|
|`--shadow-focus`     |`0 0 0 3px rgba(11,110,110,0.25)`                       |Focus ring on inputs and buttons      |
|`--shadow-sm`        |`0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)`|Dropdowns, tooltips                   |
|`--shadow-md`        |`0 4px 16px rgba(0,0,0,0.12)`                           |Floating buttons, popovers            |
|`--shadow-lg`        |`0 8px 32px rgba(0,0,0,0.18)`                           |Modals, bottom sheets                 |
|`--shadow-glow-teal` |`0 0 60px 12px rgba(11,110,110,0.18)`                   |Behind hero shift cards on dark panels|
|`--shadow-glow-amber`|`0 0 60px 12px rgba(212,144,10,0.14)`                   |Behind earnings card on dark panels   |

-----

## Navigation

### Dark Nav (Landing Page, Dark Sections)

|Element                  |Value                                                         |
|-------------------------|--------------------------------------------------------------|
|Background               |`rgba(10,10,10,0.85)` + `backdrop-filter: blur(20px)`         |
|Border bottom            |`1px solid #1A1A1A`                                           |
|Logo text                |`#FFFFFF`, weight `700`                                       |
|Nav links                |`#888888`, hover: `#FFFFFF`                                   |
|Nav link hover background|`rgba(255,255,255,0.06)`                                      |
|Sign in button           |border `rgba(255,255,255,0.14)`, text `rgba(255,255,255,0.75)`|
|Get started button       |background `#FFFFFF`, text `#111111`                          |

### Light Nav (App Pages)

|Element      |Value                                                   |
|-------------|--------------------------------------------------------|
|Background   |`rgba(255,255,255,0.90)` + `backdrop-filter: blur(16px)`|
|Border bottom|`1px solid #E5E5E5`                                     |
|Logo text    |`#111111`, weight `700`                                 |
|Nav links    |`#6B7280`, hover: `#111111`                             |
|Active link  |`#0B6E6E`                                               |
|CTA button   |Primary teal button                                     |

-----

## Component Color Assignments

### Buttons

|Variant                    |Background   |Text     |Border                            |Hover                   |
|---------------------------|-------------|---------|----------------------------------|------------------------|
|**Primary** (light surface)|`#0B6E6E`    |`#FFFFFF`|none                              |`#095A5A`               |
|**Primary** (dark surface) |`#FFFFFF`    |`#111111`|none                              |`#F0F0F0`               |
|**Secondary** (light)      |`#FFFFFF`    |`#111111`|`1px solid #E5E5E5`               |`#FAFAFA`               |
|**Secondary** (dark)       |`#1A1A1A`    |`#FFFFFF`|`1px solid #2A2A2A`               |`#222222`               |
|**Ghost** (light)          |`transparent`|`#0B6E6E`|none                              |`#E6F4F4`               |
|**Ghost** (dark)           |`transparent`|`#FFFFFF`|`1px solid rgba(255,255,255,0.14)`|`rgba(255,255,255,0.06)`|
|**Accent**                 |`#D4900A`    |`#FFFFFF`|none                              |`#B87A08`               |
|**Destructive**            |`#FFFFFF`    |`#DC2626`|`1px solid #DC2626`               |`#FEF2F2`               |
|**Disabled**               |`#F4F4F5`    |`#9CA3AF`|none                              |none                    |

Button sizes:

|Size   |Height|Padding (H)|Font size|Weight|
|-------|------|-----------|---------|------|
|Small  |`32px`|`12px`     |`13px`   |`500` |
|Default|`38px`|`16px`     |`14px`   |`600` |
|Large  |`46px`|`20px`     |`15px`   |`600` |

All buttons: `border-radius: 8px` (`--radius-md`). Letter spacing: `-0.1px`.

### Form Inputs

|State   |Border                      |Background|Label color|
|--------|----------------------------|----------|-----------|
|Default |`#D1D5DB`                   |`#FFFFFF` |`#374151`  |
|Focus   |`#0B6E6E` + `--shadow-focus`|`#FFFFFF` |`#111111`  |
|Filled  |`#D1D5DB`                   |`#FFFFFF` |`#374151`  |
|Error   |`#DC2626`                   |`#FFFFFF` |`#DC2626`  |
|Disabled|`#E5E5E5`                   |`#FAFAFA` |`#9CA3AF`  |

Input height: `42px`. Border radius: `6px`. Label: `12px`, weight `500`, color `#374151`.

### Mobile Bottom Nav

|State   |Icon     |Label    |Indicator                |
|--------|---------|---------|-------------------------|
|Active  |`#0B6E6E`|`#0B6E6E`|`2px top border, #0B6E6E`|
|Inactive|`#9CA3AF`|`#6B7280`|none                     |

-----

## Verified Badge

|Property     |Light surface                  |Dark surface                    |
|-------------|-------------------------------|--------------------------------|
|Background   |`#F0FDF4`                      |`#052E16`                       |
|Text         |`#16A34A`                      |`#4ADE80`                       |
|Border       |`1px solid rgba(22,163,74,0.2)`|`1px solid rgba(74,222,128,0.2)`|
|Font         |`11px`, weight `600`           |same                            |
|Padding      |`3px 10px`                     |`3px 10px`                      |
|Border radius|`9999px`                       |`9999px`                        |
|Icon         |Checkmark circle, same green   |Checkmark circle, same green    |

-----

## Dark Panel Layout Rules

Dark panels span the full viewport width. Used for: hero, feature showcases, CTA.

- Background: `#0A0A0A` — pure black, no tint
- Heading text: `#FFFFFF`
- Body/secondary text: `#888888`
- Muted/metadata text: `#6B7280`
- Card backgrounds inside dark panels: `#111111` with `1px solid #1F1F1F` border
- Glow halos: `--shadow-glow-teal` or `--shadow-glow-amber` behind showcased UI elements
- Subtle grid overlay: `rgba(255,255,255,0.025)` lines at `44px` intervals
- Section vertical padding: `112px` top and bottom
- Content max-width: `1180px`, centered

Forms never appear on dark surfaces. Inputs, registration, and login forms always appear on white (`#FFFFFF`) backgrounds.

-----

## Layout Grid

|Breakpoint           |Max content width|Horizontal padding|
|---------------------|-----------------|------------------|
|Mobile `< 768px`     |`100%`           |`16px`            |
|Tablet `768px–1024px`|`100%`           |`24px`            |
|Desktop `> 1024px`   |`1180px`         |`40px`            |

-----

## Accessibility

- `#0B6E6E` on `#FFFFFF`: contrast **5.2:1** — WCAG AA ✓
- `#FFFFFF` on `#0A0A0A`: contrast **21:1** — WCAG AAA ✓
- `#888888` on `#0A0A0A`: contrast **5.9:1** — WCAG AA ✓ for body text
- `#6B7280` on `#FFFFFF`: contrast **4.6:1** — WCAG AA ✓
- Never use `#E5E5E5` or `#D1D5DB` as text — borders only
- Minimum tap target: `44px × 44px` on mobile
- Never remove focus rings — use `--shadow-focus` on all interactive elements
- Always pair badge colour with a text label — never colour alone