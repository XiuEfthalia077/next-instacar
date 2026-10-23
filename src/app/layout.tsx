import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://instacar.vercel.app";
const SITE_NAME = "InstaCar";
const SHORT_DESCRIPTION = "Rent a car easily in the Philippines with flexible 10, 12, or 24-hour tiers, pickup, or delivery options.";
const FULL_DESCRIPTION = "InstaCar — a premier car rental service in the Philippines offering flexible 10-hour, 12-hour, and 24-hour rental tiers with convenient pickup or doorstep delivery.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "InstaCar Rental Service | Car Rental Philippines",
    template: "%s | InstaCar",
  },
  description: FULL_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "InstaCar Team" }],
  generator: "Next.js",
  keywords: [
    "car rental philippines",
    "rent a car",
    "instacar",
    "car rental service",
    "flexible car rental",
    "car delivery philippines",
  ],
  // Open Graph (Facebook, LinkedIn, Discord, etc.)
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "InstaCar Rental Service — Flexible Car Rentals in the Philippines",
    description: SHORT_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "InstaCar Rental Service Logo",
      },
    ],
    locale: "en_PH",
  },
  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "InstaCar Rental Service",
    description: SHORT_DESCRIPTION,
    images: ["/logo.png"],
  },
  // Robots indexing
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
  // Verification if you use Google Search Console later
  verification: {
    // google: "your-google-verification-code",
  },
};

/**
 * Applies the stored theme before the first paint (legacy behaviour —
 * `instacar-admin-theme` in localStorage).
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('instacar-admin-theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('dark-mode');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}