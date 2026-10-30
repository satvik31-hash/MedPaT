import type { Metadata, Viewport } from "next";
import { OfflineIndicator } from "@/components/offline";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedPAT — your health record, in your pocket",
  description:
    "A consent-aware clinical record and case-taking platform for Indian hospitals. Structured case sheets, ABDM-ready records, and consent enforced in the database.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MedPAT", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F7FD" },
    { media: "(prefers-color-scheme: dark)", color: "#060B18" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* A humanist sans with clear numerals and unambiguous 1 l I / 0 O.
            Dosages get misread. Loaded at runtime with a real fallback stack,
            so an offline demo still renders correctly. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
        <style>{`:root { --font-plex: "IBM Plex Sans"; }`}</style>
        {/* Restore the viewer's saved text size and theme before first paint,
            so the patient app never flashes at the wrong size. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('medpat-scale');if(s)document.documentElement.style.setProperty('--scale',s);var t=localStorage.getItem('medpat-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}
