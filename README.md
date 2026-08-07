# FloodPath: AI-Powered Waterlogging & Flood-Prone Route Advisor 🌊🗺️

**FloodPath** is a real-time, AI-driven navigation application designed to solve one of the most dangerous urban challenges: **Waterlogging and Flood-Prone Routes**. During monsoon season or extreme weather, traditional navigation apps (like Google Maps or Waze) optimize for the *fastest* route, often directing vehicles straight into severe flooding.

FloodPath solves this by explicitly routing users *around* known flood zones, providing alternative safe routes, and featuring a built-in AI assistant to answer risk-related queries.

## 🎯 Problem Statement Alignment
This project directly addresses the **"Waterlogging & Flood-Prone Route Advisor"** problem statement by delivering:
1. **Historical Flood Data Integration:** Maps high, moderate, and low-risk waterlogged zones.
2. **Safe Routing Algorithm:** Uses Open Source Routing Machine (OSRM) layered with geo-fenced flood data to compute routes that avoid danger.
3. **Alternative Route Comparison:** Allows users to compare the "Safest" vs "Fastest" route, showing time and distance tradeoffs.
4. **Live Turn-by-Turn Navigation:** Features a robust, accessible Turn-by-Turn GPS tracking overlay with fallback mechanisms for indoor use.

## ✨ Key Features (Hackathon Highlights)
- **Code Quality & Maintainability:** Built with TypeScript, Next.js 16 (App Router), and strict ESLint/Prettier standards. Core logic features extensive JSDoc annotations.
- **Security:** Hardened with strict HTTP Security Headers (`X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`) to prevent XSS and Clickjacking.
- **Efficiency:** Implements an LRU-style in-memory cache for OSRM routing requests, drastically reducing redundant network calls and latency. Maps are dynamically imported (`ssr: false`) to minimize bundle size.
- **Testing:** Configured with **Vitest** to ensure core routing logic, polyline decoding, and step-parsing remain fault-tolerant.
- **Accessibility (a11y):** The Turn-by-Turn Navigation UI utilizes `aria-live="polite"` regions, allowing screen readers to automatically read out directions for visually impaired users. All interactive elements have semantic tags and `aria-labels`.

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (React 19)
- **Styling:** Tailwind CSS (v4) with Premium Glassmorphism UI
- **Maps:** Leaflet.js with React-Leaflet
- **Routing Engine:** OSRM (Open Source Routing Machine)
- **AI Integration:** Google Gemini API (for NLP risk assessment)
- **Testing:** Vitest

## 🚀 Getting Started

1. Clone the repository
2. Run `npm install`
3. Create a `.env.local` file and add your Gemini API Key: `GEMINI_API_KEY=your_key_here`
4. Run `npm run dev` to start the local server.
5. To run tests: `npm run test`

## 🏆 Designed for the Hackathon
FloodPath isn't just a prototype—it's an accessible, secure, and production-ready architecture designed to prove how AI and Open Source GIS data can save lives during urban flooding.
