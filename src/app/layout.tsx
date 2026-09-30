import type { Metadata } from "next";
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
    title: "Routely — Intelligent card routing",
    description: "One proxy card. Every purchase automatically charged to the card that maximizes your rewards.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
    return (<html lang="en" className={`${sora.variable} ${ibm.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-foam">{children}</body>
    </html>);
}
