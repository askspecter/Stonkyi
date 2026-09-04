"use client";

import { useEffect, useState } from "react";

// A curated set of distinct brokers to cycle through as the "example".
const IDS = [412, 23, 168, 7, 900, 314, 555, 88, 250, 631];

export function RotatingBroker() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % IDS.length), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-square w-full">
      {IDS.map((id, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={`/nft/images/${id}.png`}
          alt="StonkInu broker"
          className="pixel absolute inset-0 h-full w-full rounded-2xl transition-opacity duration-500"
          style={{ opacity: idx === i ? 1 : 0 }}
          loading="eager"
        />
      ))}
    </div>
  );
}
