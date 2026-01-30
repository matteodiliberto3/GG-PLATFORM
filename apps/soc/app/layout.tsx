import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SOC | GG Platform",
  description: "Situation Room - EDR SOC Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.variable} style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ flex: 1 }}>{children}</div>
        <footer style={{ padding: "0.5rem 1rem", fontSize: "0.75rem", color: "#666", textAlign: "center" }}>
          Accesso richiede certificato client. Assicurati di aver installato il certificato (doc mTLS).
        </footer>
      </body>
    </html>
  );
}
