import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tokentiva | Infraestructura para tokenización de activos reales",
    template: "%s | Tokentiva",
  },
  description: "Infraestructura B2B para preparar, organizar y gestionar operaciones de tokenización de activos reales.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
