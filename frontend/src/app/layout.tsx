import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WorkPulse HRIS — Attendance & Geofenced Clock-In",
  description: "Enterprise employee attendance, verified selfie capture, and perimeter compliance engine.",
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/workpulse-emblem.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WorkPulse",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`h-full ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-[#FAF7F2] text-[#161B26] font-sans antialiased selection:bg-[#FDE68A] selection:text-[#92400E]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
