# Barberpage & Pak Kasir Ecosystem Architecture

This document provides a comprehensive overview of the integrated ecosystem between the **Barberpage** (Customer-facing Web) and **Pak Kasir** (Internal POS System).

## 📌 Overview
The ecosystem is designed to provide a seamless flow from customer booking to service delivery and inventory management. Both applications share a single **Supabase** backend for real-time data synchronization.

---

## 🏗 Core Applications

### 1. Barberpage (Customer Portal)
- **Repo Name:** `dcukur-web`
- **Path:** `./barberpage`
- **Purpose:** Brand presence, service catalog, lookbook, and online booking system.
- **Tech Stack:** React 18, Vite, Framer Motion (Animations), Tailwind CSS, Lucide Icons.
- **Key Routes:**
    - `/`: Landing page with Hero, Services, Catalog, and Testimonials.
    - `/book`: Mobile-optimized booking interface.
    - `/queue/:id`: Live status tracking for customers.
    - `/_studio_admin`: Full management dashboard for services, products, barbers, and gallery.

### 2. Pak Kasir (Staff POS)
- **Repo Name:** `pak-kasir`
- **Path:** `../pak_kasir`
- **Purpose:** Point of Sale, inventory management, sales reporting, and booking fulfillment.
- **Tech Stack:** React 18, Vite, Zustand (State), Dexie.js (Offline-first IndexedDB), Capacitor (Native features).
- **Key Features:**
    - **Offline-first:** Works without internet, syncs when online.
    - **Booking Alerts:** Real-time notifications when a new booking is made on Barberpage.
    - **Inventory Sync:** Stock changes in POS are reflected in the Barberpage catalog.
    - **Customer Loyalty:** Shared CRM for tracking points and visit history.

---

## 🔗 Database Integration (Supabase)

Both projects connect to the same Supabase project: `ifawbnmbmedwwsmaqzxm.supabase.co`.

### Shared Tables & Roles

| Table | Barberpage Role | Pak Kasir Role |
| :--- | :--- | :--- |
| `services` | **Source of Truth.** Managed via Admin Panel. | Pulled as "Products" in POS (mapped with category 999). |
| `products` | Displayed in Catalog/Lookbook. | **Source of Truth for Retail.** Managed via Inventory. |
| `bookings` | Customer inserts new records here. | Staff confirms/completes bookings via Realtime. |
| `customers` | Profile viewing & Loyalty points display. | CRM management & Points awarding. |
| `categories` | Filtering for web display. | Organization for POS interface. |
| `barbers` | Displayed as "Capsters" in team section. | Used for assigning sales/bookings. |

---

## 🔄 Critical Workflows

### 1. The Sync Engine (Pak Kasir)
- **Location:** `src/services/syncService.ts`
- **Logic:** Bi-directional sync using a "last sync" heartbeat.
- **Mapping:** 
    - Local camelCase (Dexie) is converted to snake_case (Supabase).
    - Remote `services` table is mapped into the local `products` table in POS to allow selling services as line items.
- **Mirroring:** The POS can "mirror" remote tables, pruning local records that no longer exist on Supabase.

1. **Customer** visits `barberpage` and makes a booking.
2. Record is added to `bookings` table with status `pending`.
3. **Pak Kasir** (via `onlineStore.ts` Realtime subscription) receives a notification.
4. **Staff** in POS confirms the booking, changing status to `confirmed`.
5. **Customer** can track their position via the `/queue/:id` link.

### 2. Inventory & Catalog Sync
1. **Admin** adds a new retail product via Barberpage Admin.
2. **Pak Kasir** syncs and adds the product to its local database.
3. **Staff** sells the product in-store; POS decrements local stock and pushes update to Supabase.
4. **Barberpage** Catalog reflects updated "Stock Available" or "Out of Stock" status instantly.

### 3. Service Management
1. **Admin** updates the price of "Executive Haircut" in Barberpage Admin.
2. **Pak Kasir** detects the change during the next sync heartbeat.
3. POS automatically uses the new price for all subsequent transactions.

---

## 🛠 Maintenance Notes for AI Assistants

- **Environment Variables:** Both apps require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Sync Logic:** In `pak_kasir`, look at `src/services/syncService.ts` for how Dexie maps to Supabase.
- **Realtime:** Realtime subscriptions are critical for the booking notification system.
- **Styling:** Barberpage uses Tailwind + CSS Modules; Pak Kasir uses Vanilla CSS Modules.
