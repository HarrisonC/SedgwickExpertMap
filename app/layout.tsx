import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sedgwick | Marine expert network",
  description: "Explore marine expertise around the world. Filter specialists by expertise and region.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
