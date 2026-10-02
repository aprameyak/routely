import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import "./globals.css";
const sora = Sora({
    variable: "--font-sora",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});
const ibm = IBM_Plex_Mono({
    variable: "--font-ibm",
    subsets: ["latin"],
    weight: ["400", "500"],
});
export const metadata: Metadata = {
    title: "Routely — One proxy card",
    description: "Proxy card that routes each charge to the right funding card.",
    applicationName: "Routely",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Routely",
    },
    icons: {
        icon: [
            { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
};
export const viewport: Viewport = {
    themeColor: "#0f766e",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};
export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (<html lang="en" className={`${sora.variable} ${ibm.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-foam">{children}</body>
    </html>);
}
