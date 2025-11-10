# Design Guidelines: PDF Tools Platform

## Design Approach
**Reference-Based Approach**: Drawing inspiration from iLovePDF's clean tool categorization and 10015.io's modern interface design. The platform combines iLovePDF's intuitive tool organization with 10015.io's contemporary visual treatment.

## Core Design Principles
- **Tool-First Interface**: Immediate access to all 24 tools through categorized grid layout
- **Processing Transparency**: Clear visual feedback for file uploads and processing states
- **Dual-Mode Excellence**: Seamless dark/light theme switching with consistent experience
- **Client-Side Priority**: Instant interactions for applicable tools with smooth backend transitions

## Color Palette

### Dark Mode
- **Primary**: 9 75% 61% (warm red for CTAs and active states)
- **Secondary**: 30 15% 52% (neutral brown for secondary elements)
- **Background**: 20 14% 4% (deep warm black)
- **Cards**: 20 14% 8% (elevated dark surfaces)
- **Text**: 45 25% 91% (warm off-white)

### Light Mode
- **Primary**: 9 75% 61% (consistent warm red)
- **Secondary**: 30 15% 52% (consistent neutral brown)
- **Background**: 0 0% 96.08% (soft warm white)
- **Cards**: 300 4.35% 6.67% (slightly elevated light surfaces)
- **Text**: 0 0% 5.1% (near black)

### Semantic Colors
- Success: 142 76% 36% (green for completed operations)
- Warning: 38 92% 50% (amber for processing states)
- Error: 0 84% 60% (red for failures)

## Typography
- **Font Family**: Inter (sans-serif) throughout
- **Headings**: 
  - H1: 2.5rem/3rem font-bold (homepage hero)
  - H2: 2rem/2.5rem font-semibold (section headers)
  - H3: 1.5rem/2rem font-semibold (category titles)
  - H4: 1.25rem/1.75rem font-medium (tool cards)
- **Body**: 1rem/1.5rem font-normal
- **Small**: 0.875rem/1.25rem (metadata, captions)

## Layout System
- **Base Unit**: 0.25rem (Tailwind's spacing scale)
- **Common Spacing**: Use units of 4, 8, 12, 16, 24, 32 (p-4, m-8, gap-6, etc.)
- **Container**: max-w-7xl mx-auto for main content
- **Grid System**: 
  - Tool cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6
  - Category sections: Stacked with clear visual separation

## Component Library

### Navigation
- Sticky header with logo, tool search bar, theme toggle, and user account
- Category tabs for quick filtering (Conversion, Organization, Optimization, Security, Editing, CSS Tools, Typing Test)
- Mobile: Hamburger menu with slide-out drawer

### Tool Cards
- Card dimensions: Consistent height with 0.4rem border radius
- Card structure: Icon (48px), tool name, brief description, "Select Files" CTA
- Hover state: Subtle elevation increase and primary color accent
- Icons: Use Heroicons or similar library with 48px size

### File Upload Interface
- Drag-and-drop zone with dashed border and upload icon
- File list with thumbnail preview, name, size, and remove option
- For PDF merge: Drag handles for reordering files
- Progress indicators: Linear progress bars with percentage

### Processing States
- Upload: Pulsing animation on drop zone
- Processing: Spinner with status text
- Complete: Check icon with download button
- Error: Alert icon with retry option

### CSS Tools Section
- Gradient generator with live preview
- Shadow generator with visual editor
- Color palette tools with hex/rgb/hsl output
- Each tool in dedicated card with controls and preview panel

### Typing Test
- Clean monospace text display area
- Real-time WPM and accuracy metrics
- Word highlighting: Gray (untyped), primary (current), green (correct), red (error)
- Test controls: Duration selector, restart button, theme options

## Visual Treatment

### Shadows
- Card elevation: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
- Hover elevation: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
- Modal overlay: 0 25px 50px -12px rgb(0 0 0 / 0.25)

### Border Radius
- Cards, buttons, inputs: 0.4rem
- Small elements (badges, pills): 0.5rem
- Avatars, circular elements: 9999px (full)

### Animations
- Theme toggle: 200ms ease-in-out transition
- Card hover: 150ms ease transform and shadow
- File upload: Slide-in animation (300ms)
- Minimal use of decorative animations—focus on functional feedback

## Images
**No hero image required.** This is a utility platform where tool cards are the hero. The homepage immediately displays the categorized tool grid for quick access. Any imagery should be:
- Tool icons: Consistent style, monochromatic with primary color accent
- Preview thumbnails: PDF page previews at 200px max width
- Feature illustrations: Minimal, supporting specific tool capabilities

## Responsive Behavior
- Mobile (< 768px): Single column tool grid, simplified navigation, bottom sheet for file options
- Tablet (768px - 1024px): 2-column tool grid, compact header
- Desktop (> 1024px): 3-4 column tool grid, full navigation, side panel for processing queue

## Accessibility
- WCAG AA contrast ratios maintained in both themes
- Keyboard navigation for all interactive elements
- Screen reader labels for icon-only buttons
- Focus indicators with primary color ring
- Error states announced to assistive technologies