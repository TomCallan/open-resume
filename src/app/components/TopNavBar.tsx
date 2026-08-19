"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logoSrc from "public/logo.svg";
import { cx } from "lib/cx";

export const TopNavBar = () => {
  const pathName = usePathname();
  const isHomePage = pathName === "/";

  return (
    <header
      aria-label="Site Header"
      className={cx(
        "flex h-[var(--top-nav-bar-height)] items-center border-b-2 border-gray-100 px-3 lg:px-12",
        isHomePage && "bg-dot"
      )}
    >
      <div className="flex h-10 w-full items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="sr-only">CraftCV</span>
          <Image
            src={logoSrc}
            alt="CraftCV Logo"
            className="h-8 w-auto"
            priority
          />
        </Link>
        <nav
          aria-label="Site Nav Bar"
          className="flex items-center gap-2 text-sm font-medium"
        >
          {[
            ["/resume-builder", "Builder"],
            ["/resume-parser", "Parser"],
          ].map(([href, text]) => (
            <Link
              key={text}
              className="rounded-md px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 lg:px-4"
              href={href}
            >
              {text}
            </Link>
          ))}
          <Link
            href="https://github.com/TomCallan/open-resume"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 hidden rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 sm:inline-block"
          >
            GitHub
          </Link>
        </nav>
      </div>
    </header>
  );
};
