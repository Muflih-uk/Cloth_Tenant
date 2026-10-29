import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import RealtimeProvider from "@/lib/realtime/RealtimeProvider";

const jakartha = Plus_Jakarta_Sans({
  variable: "--font-jakartha",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "R JOGHANI",
  description: "Control your stock seamlessly.",
  icons: {
    icon: "/brand-logo.png",
    apple: "/brand-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "R JOGHANI",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "R JOGHANI",
    description: "Control your stock seamlessly",
    url: "https://xlapparals.in/",
    siteName: "R JOGHANI",
    images: [
      {
        url: "/opengraph.jpg",
        width: 1200,
        height: 630,
        alt: "R JOGHANI",
      },
    ],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2b61",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakartha.className} antialiased overflow-x-clip px-2 py-2 sm:px-5 sm:py-4`}
      >
        <AuthProvider>
          <RealtimeProvider>
            <ServiceWorkerRegister />
            {children}
          </RealtimeProvider>
        </AuthProvider>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{ duration: 3000 }}
        />
      </body>
    </html>
  );
}
