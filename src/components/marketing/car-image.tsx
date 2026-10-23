"use client";

import { useState } from "react";

import { carImageUrl } from "@/lib/storage";

/**
 * Car photo with a graceful fallback.
 *
 * The legacy markup rendered `<img src="...">` without any error handling, but
 * the Next.js port needs a client boundary for `onError`. When the stored
 * photo is missing from the `car-images` bucket the shared `default.png` is
 * shown instead.
 */
export function CarImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => {
        const fallback = carImageUrl("default.png");
        setCurrent((value) => (value === fallback ? value : fallback));
      }}
    />
  );
}
