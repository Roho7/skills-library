# Fashion UI Generator

## Skill Description
Generates high-grade, aesthetic, clean, and minimal luxury fashion ecommerce UI components using Next.js, Tailwind CSS v4, motion/react, and shadcn. Inspired by editorial fashion houses like Sabyasachi.

## When to Use
Use this skill when building pages or components for the Abhaa fashion/saree ecommerce website. Invoke with `/fashion-ui` followed by what you want to build.

## Design System & Principles

### Visual DNA
- **Editorial luxury**: Every page should feel like a fashion magazine spread
- **Extreme whitespace**: Let content breathe. Generous padding (py-24, py-32, py-48). Wide margins. Space is the luxury.
- **Typography-driven hierarchy**: Large, confident serif/sans headings. Small, spaced-out uppercase labels. Thin letterpress-style subtext.
- **Muted earth tones**: Warm whites (#FAFAF8), soft creams, charcoal blacks (#1A1A1A), warm grays. Avoid saturated colors.
- **Full-bleed imagery**: Large, atmospheric product photography dominates. Images are the hero, not UI chrome.
- **Grid-based editorial layouts**: Asymmetric grids, masonry-like arrangements, alternating large/small image blocks.
- **No visual clutter**: No shadows, no gradients, no rounded corners on cards. Minimal borders (1px max, very light). No badges or busy CTAs.

### Typography Rules
- Headings: Use the project font (Figtree) at large sizes (text-4xl to text-7xl), font-light or font-normal, tight tracking (tracking-tight)
- Category labels: uppercase, text-xs, tracking-[0.2em] or tracking-widest, text-muted-foreground
- Body: text-sm to text-base, font-light, leading-relaxed
- Navigation: uppercase, text-xs, tracking-widest, font-normal
- Quotes/taglines: italic, text-lg to text-2xl, font-light, centered

### Layout Patterns
1. **Hero**: Full-viewport image with centered overlay text (white on dark image). Minimal text - brand name + one tagline line.
2. **Category Grid**: 2-4 column grid, images take full cell, text below in small uppercase. On hover: subtle scale(1.02) with overflow-hidden container.
3. **Editorial Story Block**: Alternating rows - one side large image, other side text with generous padding. Or: centered paragraph block between two image rows.
4. **Product Catalog**: Clean grid (2-4 cols). Image fills card. Below: product name (font-normal), price (font-light, text-muted-foreground). No add-to-cart button visible in catalog view.
5. **Lookbook/Collection**: Asymmetric grid mixing portrait and landscape images. Minimal text. Let photography speak.
6. **Footer**: Dark background (#1A1A1A or similar), organized columns, small text, generous spacing.

### Animation Guidelines (motion/react)
Use `motion` from `"motion/react"` (NOT framer-motion). Keep animations subtle and luxurious:

```tsx
import { motion } from "motion/react"
```

- **Page entrance**: Fade up (y: 20 → 0, opacity: 0 → 1) with duration 0.8s, ease: [0.25, 0.1, 0.25, 1]
- **Staggered reveals**: staggerChildren: 0.1 for grid items
- **Image hover**: scale 1.02-1.05 over 0.6s with overflow-hidden parent
- **Text reveals**: Fade in from below, one element at a time
- **Scroll-triggered**: Use `whileInView` with `viewport={{ once: true, amount: 0.3 }}`
- **Navigation**: Underline slides in from left on hover using layoutId or width animation
- **NEVER**: Bounce, spring with high bounce, rotate, or any playful animation. This is luxury, not playful.

### Component Patterns

```tsx
// Staggered grid container
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.2 }}
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
  }}
  className="grid grid-cols-2 md:grid-cols-4 gap-1"
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } }
      }}
    >
      {/* content */}
    </motion.div>
  ))}
</motion.div>
```

```tsx
// Image with hover zoom
<div className="overflow-hidden">
  <motion.img
    src={src}
    alt={alt}
    className="w-full h-full object-cover"
    whileHover={{ scale: 1.03 }}
    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
  />
</div>
```

```tsx
// Section heading pattern
<div className="text-center py-24 md:py-32">
  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Collection</p>
  <h2 className="text-4xl md:text-6xl font-light tracking-tight">The New India</h2>
</div>
```

### Color Usage
- Background: white (#FFFFFF) or warm off-white (#FAFAF8)
- Text: near-black (#1A1A1A) for headings, gray (#6B6B6B) for secondary
- Borders: very light (#E8E8E8), used sparingly
- Dark sections: #1A1A1A background, #FAFAF8 text
- Gold accents (sparingly): #C5A572 for luxury CTAs or small details
- NEVER use the default shadcn purple/violet theme colors for visible UI

### Image Handling
- Always use `next/image` with proper aspect ratios
- Common ratios: 3:4 (portrait/product), 16:9 (landscape/hero), 1:1 (grid), 2:3 (editorial)
- Use `object-cover` always
- Placeholder images: use warm gray backgrounds (#D4CBC2) with centered text describing the image

### Navigation Pattern
- Fixed top, transparent or white background
- Center: brand name in large text (text-xl to text-2xl, tracking-widest, uppercase)
- Below or beside: category links (text-xs, uppercase, tracking-widest)
- Mobile: minimal hamburger, full-screen overlay menu with large typography
- Subtle border-bottom or no border at all

### Responsive Rules
- Mobile-first, but the desktop experience is the primary showcase
- Mobile: single column, stack everything vertically, maintain generous spacing
- Tablet: 2 columns for grids
- Desktop: 3-4 columns, asymmetric layouts, full editorial experience
- Navigation collapses to hamburger on mobile

### File Organization
- Pages: `app/(routes)/page-name/page.tsx`
- Sections: `components/sections/SectionName.tsx` (each major page section is its own component)
- Shared UI: `components/ui/` (shadcn components)
- Fashion-specific components: `components/fashion/` (Navbar, Footer, ProductCard, HeroSection, etc.)

## Implementation Checklist
When generating any fashion UI component:
1. Use "use client" directive if using motion or any client-side interactivity
2. Import motion from "motion/react"
3. Use Tailwind classes only (no inline styles)
4. Generous whitespace (minimum py-16 between sections, prefer py-24+)
5. All images use next/image
6. All animations are subtle, slow (0.6-1s), with custom easing
7. Typography follows the rules above
8. Colors are muted and earthy, never saturated
9. Mobile responsive
10. No unnecessary UI decoration (no shadows, no gradients, no border-radius on cards)
