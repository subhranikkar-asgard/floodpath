import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://floodpath.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FloodPath — Kolkata Flood Risk & Route Advisor",
    template: "%s | FloodPath Kolkata",
  },
  description:
    "AI-powered flood risk advisor for Kolkata. Check if your route or neighbourhood is safe during monsoon season. Grounded in verified public data — never hallucinates safety claims. Free, instant, no sign-up.",
  keywords: [
    "Kolkata flood risk",
    "Kolkata waterlogging",
    "monsoon route advisor",
    "flood safe route Kolkata",
    "Kolkata flood map",
    "waterlogging Jadavpur",
    "flood Ultadanga",
    "KMC flood advisory",
    "safe route monsoon Kolkata",
    "FloodPath",
  ],
  authors: [{ name: "FloodPath" }],
  creator: "FloodPath",
  publisher: "FloodPath",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE_URL,
    siteName: "FloodPath",
    title: "FloodPath — Kolkata Flood Risk & Route Advisor",
    description:
      "Check if your Kolkata route is safe during monsoon. AI-powered, data-grounded flood risk assessment. Instant, free, no sign-up needed.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FloodPath — Kolkata Flood Risk Advisor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FloodPath — Kolkata Flood Risk & Route Advisor",
    description:
      "Check if your Kolkata route is safe during monsoon. AI-powered, data-grounded flood risk assessment.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "civic safety",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0f1e" />
        <meta name="geo.region" content="IN-WB" />
        <meta name="geo.placename" content="Kolkata" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "FloodPath",
              description:
                "AI-powered flood risk advisor for Kolkata routes and neighbourhoods. Grounded in verified public monsoon data.",
              url: BASE_URL,
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Any",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
              areaServed: {
                "@type": "City",
                name: "Kolkata",
                addressCountry: "IN",
              },
              featureList: [
                "Flood risk assessment",
                "Route safety check",
                "Monsoon waterlogging alerts",
                "Historical flood data",
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
