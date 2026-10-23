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

export const metadata: Metadata = {
  title: {
    default: "InstaCar Rental Service",
    template: "%s | InstaCar",
  },
  description:
    "InstaCar — a car rental service in the Philippines offering flexible 10-hour, 12-hour and 24-hour rental tiers with pickup or delivery.",
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
