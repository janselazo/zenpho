import Image from "next/image";
import { trustedLocalBusinesses } from "@/lib/trusted-local-businesses";

export default function TrustedByLocalBusinesses() {
  return (
    <div className="relative z-0 mx-auto mt-14 w-full max-w-6xl">
      <p className="text-center text-sm font-bold tracking-wide text-zinc-500 dark:text-zinc-400">
        Trusted by 50+ Local Businesses
      </p>
      <div className="mt-8 grid grid-cols-2 justify-items-center gap-x-4 gap-y-7 px-1 sm:gap-x-6 sm:gap-y-8 md:flex md:flex-wrap md:items-center md:justify-center md:gap-x-12 md:gap-y-8 lg:gap-x-16">
        {trustedLocalBusinesses.map((b) => (
          <div
            key={b.name}
            className="flex min-h-9 w-full max-w-[11.5rem] items-center justify-center sm:max-w-[13rem] md:h-9 md:w-auto md:max-w-none md:shrink-0"
          >
            <Image
              src={b.logoSrc}
              alt={b.name}
              width={b.width}
              height={b.height}
              className="h-7 w-auto max-h-8 max-w-full object-contain object-center opacity-[0.72] grayscale sm:h-8 dark:opacity-[0.68]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
