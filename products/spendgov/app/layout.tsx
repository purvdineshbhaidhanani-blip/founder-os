import type { Metadata } from "next";
import { NO_FLASH_THEME_SCRIPT } from "@founder-os/ui/theme";
import "@founder-os/ui/tokens.css";
import "@founder-os/ui/primitives.css";
import "@founder-os/ui/dashboard.css";
import "@founder-os/ui/layout.css";
import "@founder-os/ui/admin.css";
import "./product.css";
import { Providers } from "./providers.js";

export const metadata: Metadata = {
  title: "SpendGov — AI-powered SaaS + AI spend intelligence",
  description: "See every SaaS and AI subscription, find the waste, and recover millions in overpayments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
