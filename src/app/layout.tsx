import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RELYTASK",
  description: "Operations platform for your team — projects, tasks, SOPs and delivery.",
  icons: { icon: "/Logo.png", apple: "/Logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
