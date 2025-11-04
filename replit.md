# iEditOnline - PDF & CSS Tools Platform

## Overview
iEditOnline is a comprehensive web-based platform offering 24 PDF manipulation features, CSS development tools, and a typing test. It leverages pure client-side processing for all PDF operations, ensuring data privacy and speed. Built with Next.js 15 (App Router), TypeScript, and modern UI components, the platform provides a clean, tool-first interface with dual dark/light theme support, inspired by leading online PDF tools. The project aims to deliver a robust and user-friendly experience for document and web development tasks.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
The platform is built with Next.js 15 App Router and TypeScript. Frontend calls an external backend server (running on `http://localhost:3001`) for file conversions, while PDF organization tools primarily use client-side processing. React Server Components with client boundaries are utilized for interactive features.

### UI Component System
The UI is built using Shadcn UI library (New York style) with Radix UI primitives for accessibility. Tailwind CSS provides utility-first styling with custom design tokens and a CVA-based component variant management. A React Context-based theme system supports light/dark modes.

### State Management
TanStack Query is used for server state and caching, while React Hook Form with Zod resolvers handles form validation. Local React Context manages theme state.

### Design System
A custom color palette with HSL values supports both light and dark modes, featuring a warm red primary color. Inter is the chosen font family. Responsive grid layouts (1-4 columns) and consistent spacing using Tailwind's base unit system ensure a modern and adaptable interface.

### Development Workflow
The application runs with a Next.js development server on port 5000, and a separate backend server on port 3001 for conversions. Client-side processing handles PDF organization, while format conversion tools utilize backend API endpoints.

### Application Structure
The Next.js App Directory structure includes `/app` for pages and layouts, `/components` for reusable React components, and `/lib` for utility functions and PDF processing logic. Path aliases are configured for root imports.

### Tool Categories
The platform offers a wide range of tools categorized into:
-   **Conversion:** 8 tools for PDF ↔ Word/Excel/PPT/JPG conversions.
-   **Organization:** 4 tools including Merge, Split, Rotate, and Extract.
-   **Optimization:** Compress and Repair tools.
-   **Security:** Protect and Unlock tools.
-   **Editing:** An in-app PDF editor for text, images, shapes, drawing, and annotation, replacing external solutions. This includes the ability to edit existing PDF text using an overlay technique.
-   **Additional:** CSS Tools and a Typing Test.

### PDF Tool Implementation
**Client-Side Processing (Organization Tools):** Leverages `pdfjs-dist` for parsing and text extraction, and `pdf-lib` for PDF manipulation (merge, compress, rotate, split, protect). PDF.js is loaded from a CDN to avoid bundling issues. A robust PDF preview system renders thumbnails with caching and resource cleanup.

**Backend Processing (Conversion Tools):** An external backend server handles all format conversions, including Office ↔ PDF and PDF ↔ Image conversions, via dedicated API endpoints.

## External Dependencies

**Core UI Libraries**
-   @radix-ui/* (Accessible component primitives)
-   tailwindcss (Utility-first CSS framework)
-   lucide-react (Icon library)
-   cmdk (Command menu component)

**Type Safety & Validation**
-   TypeScript (Static type checking)
-   Zod (Runtime schema validation)

**State & Forms**
-   @tanstack/react-query (Server state management)
-   react-hook-form (Form handling)
-   @hookform/resolvers (Form validation resolvers)

**Development Tools**
-   Next.js 15 (Full-stack React framework)
-   PostCSS & Autoprefixer (CSS processing)

**Utilities**
-   clsx & tailwind-merge (Class name utilities)
-   date-fns (Date manipulation)
-   nanoid (Unique ID generation)

**PDF Processing Libraries**
-   pdfjs-dist (PDF parsing and text extraction, loaded from CDN)
-   pdf-lib (PDF manipulation and creation)
-   docx (Word document generation)
-   xlsx (Excel spreadsheet generation)

**Design Resources**
-   Google Fonts (Inter, JetBrains Mono)