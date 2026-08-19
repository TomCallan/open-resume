import Image from "next/image";
import featureFreeSrc from "public/assets/feature-free.svg";
import featureUSSrc from "public/assets/feature-us.svg";
import featurePrivacySrc from "public/assets/feature-privacy.svg";
import featureOpenSourceSrc from "public/assets/feature-open-source.svg";
import { Link } from "components/documentation";

const FEATURES = [
  {
    src: featureFreeSrc,
    title: "Free Forever",
    text: "CraftCV is built on the belief that everyone deserves free, unrestricted access to modern professional resume designs and LaTeX quality typography.",
  },
  {
    src: featureUSSrc,
    title: "U.S. Best Practices",
    text: "CraftCV has built-in best practices for the global and U.S. job market, fully ATS-friendly for Greenhouse, Lever, and Workday.",
  },
  {
    src: featurePrivacySrc,
    title: "Privacy-First",
    text: "CraftCV stores all resume data locally in your browser. No sign up required, zero telemetry, and your data never leaves your machine.",
  },
  {
    src: featureOpenSourceSrc,
    title: "Open-Source & AI Ready",
    text: (
      <>
        CraftCV is open-source with first-class local AI agent support (AGY, Kimi, Cursor, Claude). Source on{" "}
        <Link href="https://github.com/TomCallan/open-resume">
          GitHub
        </Link>
      </>
    ),
  },
];

export const Features = () => {
  return (
    <section className="py-16 lg:py-36">
      <div className="mx-auto lg:max-w-4xl">
        <dl className="grid grid-cols-1 justify-items-center gap-y-8 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-16">
          {FEATURES.map(({ src, title, text }) => (
            <div className="px-2" key={title}>
              <div className="relative w-96 self-center pl-16">
                <dt className="text-2xl font-bold">
                  <Image
                    src={src}
                    className="absolute left-0 top-1 h-12 w-12"
                    alt="Feature icon"
                  />
                  {title}
                </dt>
                <dd className="mt-2">{text}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
