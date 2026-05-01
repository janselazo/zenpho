import Image from "next/image";
import { trustedLocalBusinesses } from "@/lib/trusted-local-businesses";

export default function TrustedByLocalBusinesses() {
  return (
    <div className="mx-auto mt-14 w-full max-w-6xl">
      <p className="text-center text-sm font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
        Trusted by Top Local Businesses
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-8 sm:gap-x-12 md:gap-x-14 lg:gap-x-16">
        {trustedLocalBusinesses.map((b) => (
          <div
            key={b.name}
            className="flex h-8 shrink-0 items-center justify-center sm:h-9"
          >
            <Image
              src={b.logoSrc}
              alt={b.name}
              width={b.width}
              height={b.height}
              className="h-7 w-auto max-h-8 max-w-[min(100%,14rem)] object-contain object-center opacity-[0.72] grayscale sm:h-8 dark:opacity-[0.68]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
