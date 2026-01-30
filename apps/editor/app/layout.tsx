import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Editor | GG Platform",
  description: "Professional workspace per Sig. Giusti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ flex: 1 }}>{children}</div>
        <footer style={{ padding: "0.5rem 1rem", fontSize: "0.75rem", color: "#666", textAlign: "center" }}>
          Accesso richiede certificato client. Assicurati di aver installato il certificato (doc mTLS).
        </footer>
      </body>
    </html>
  );
}
