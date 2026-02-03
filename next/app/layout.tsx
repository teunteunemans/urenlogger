import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Urenlogger API",
  description: "Discord hour logging bot API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
