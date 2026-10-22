# P-KOT Spices CMS

Admin panel for the P-KOT Spices storefront: track orders, read contact-us messages, view customers and manage the product catalogue. React + Vite front end, Firebase (Auth + Firestore) back end — no server to run.

## Setup

1. **Firebase project** – create one at <https://console.firebase.google.com>, then enable
   - **Authentication → Email/Password**
   - **Firestore Database** (production mode)
2. **Config** – `cp .env.example .env` and fill in the web-app config (Project settings → Your apps).
3. **Rules** – publish [firestore.rules](firestore.rules) (`firebase deploy --only firestore:rules`, or paste into the console). The storefront may only *create* orders/messages; everything else needs an admin.
4. **First admin** – download a service-account key (Project settings → Service accounts) as `serviceAccountKey.json` in this folder (git-ignored), then:
   ```bash
   npm install
   npm run create-admin -- admin "a-strong-password"
   ```
   Log in with that username/password. (Usernames map internally to `<username>@pkot-cms.app` because Firebase Auth is email-based.) Run the command again to add more admins or reset a password.
5. **Run** – `npm run dev` (or `npm run build` and host `dist/` on Firebase Hosting / any static host).
6. **Products** – open *Products → Import from website* once to load the 26 current products into Firestore.

## Sending storefront data to the CMS

The storefront currently has no backend (orders go to WhatsApp, the contact form shows an alert). Copy [storefront/pkotCms.js](storefront/pkotCms.js) into the website, then call `saveOrder(...)` before opening WhatsApp in `checkout/[id]/page.js` and `BuyNowModal.js`, and `saveMessage(formState)` in `contact/page.js`.

## Firestore data model

| Collection | Fields |
|---|---|
| `orders` | productId, productName, weight, quantity, currency, total, name, phone, address, city, pincode, status (`new→confirmed→shipped→delivered / cancelled`), notes, createdAt |
| `messages` | name, email, subject, message, status (`unread/read/replied`), createdAt |
| `products` | id, name, category, priceINR, priceUSD, unit, description, image, inStock |
| `admins` | username — one doc per admin uid (access gate) |

## Features

Live-updating dashboard (revenue, 7-day chart, status breakdown) · order drawer with status, notes, WhatsApp link · CSV export · message inbox with reply-by-email · customers derived from orders · product CRUD · responsive/mobile layout.
