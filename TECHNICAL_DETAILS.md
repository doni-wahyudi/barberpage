# Project Technical Details — Barberpage (Auro Barbershop Portal)

An elegant, customer-facing web application and admin dashboard for Auro Barbershop, integrated with Supabase and synchronized with the Pak Kasir POS ecosystem. It allows customers to view catalogs, book slots in real-time, and track queue statuses.

---

## 1. System Overview & Tech Stack
* **Framework & Tooling**: React 18.2.0, Vite 5.1.4, React Router Dom 7.13.0, Framer Motion 11.0.8, Recharts 3.8.1.
* **Global Styling**: Tailwind CSS 3.4.19, custom CSS variables, and design tokens mapped in [src/index.css](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/index.css).
* **Supabase Integration**: Direct client-side connection initialized in [supabaseClient.js](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/lib/supabaseClient.js) using dynamic or fallback environment variables.
* **Shared Ecosystem**: Shares a database backend with `pak_kasir` POS system to synchronize retail stock, services, and live bookings.

---

## 2. Active Routing & Navigation
* **Customer Facing Routes**:
  * `/` -> Main landing page featuring [Hero](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/Hero.jsx), [Services](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/Services.jsx), [LiveSchedule](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/LiveSchedule.jsx), [Lookbook](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/Lookbook.jsx), [Team](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/Team.jsx), [Testimonials](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/Testimonials.jsx), [Location](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/Location.jsx), and footer navigation.
  * `/book` -> Dedicated mobile-optimized booking flow via [MobileBooking.jsx](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/components/MobileBooking.jsx).
  * `/check` -> Customer interface to check booking orders.
  * `/queue/:id` -> Real-time live status tracking for custom bookings/queue.
* **Admin Dashboard Routes (`_studio_admin`)**:
  * `/_studio_admin` -> Core Admin dashboard panel.
  * `/_studio_admin/login` -> Admin credentials verification page.
  * `/_studio_admin/insights` -> Business insights, statistics, and graphs (utilizing Recharts).
  * `/_studio_admin/products` -> Product inventory management (prices, retail stock).
  * `/_studio_admin/services` -> Service catalog management.
  * `/_studio_admin/capsters` -> Barber team management (active shifts, assignments).
  * `/_studio_admin/gallery` -> Gallery management for lookbook images.
  * `/_studio_admin/categories` -> General service/product categorization.
  * `/_studio_admin/settings` -> Dynamic barbershop options, pricing configurations, and hours.

---

## 3. Permanently Cleaned Up & Removed Features
* **None documented yet**: The codebase is cleanly structured and actively maintained. Avoid referencing any legacy or removed page flows without explicitly confirming their existence first.

---

## 4. Key Configurations & Restorations
* **Database Target**: `ifawbnmbmedwwsmaqzxm.supabase.co`.
* **Sync & Real-time Integration**:
  * `bookings` table updates from this app trigger real-time notifications inside the `pak_kasir` staff POS using Supabase realtime subscription.
  * Stock updates pushed by staff in the POS immediately reflect in the Barberpage retail product catalog.
* **Aesthetics**: Premium Dark Theme layout styled with a gold palette (`#d4af37`), utilizing glassmorphism cards and smooth custom micro-animations.

---

## 5. Guidelines for Future Chats & Agents
* **Consistency in Variable Usage**: Strictly utilize CSS design tokens defined in [src/index.css](file:///c:/Users/whydo/D9043DB2025/code/explore/build/barberpage/src/index.css) (such as `--gold-primary`, `--bg-primary`) rather than hardcoding colors.
* **Design Philosophy**: Ensure full readability. Headings and body texts on dark gradients must use high contrast `#ffffff` or close-to-white tones. Enhance elements with smooth hover scales (`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`) and premium buttons.
* **Development Guardrails**: 
  * Do not make preemptive git commits or pushes.
  * Let the user review working tree files locally first.

---

## 6. Verification Pipeline & Smoke Tests
* **Development Server**: `npm run dev`
* **Production Build Compilation**: `npm run build`
