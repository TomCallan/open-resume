import "globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { TopNavBar } from "components/TopNavBar";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "CraftCV - Modern, ATS & LaTeX Resume Builder & Parser",
  description:
    "CraftCV is a fast, privacy-first resume builder and ATS parser. Create beautiful LaTeX and modern professional resumes with live PDF preview, multiple curated templates, and local AI agent support.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <TopNavBar />
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
