"use client";

import Image from "next/image";

export default function GlobalLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <Image
        src="/saptarishi.png"
        alt="loader"
        width={140}
        height={140}
        className="breath"
        priority
      />
    </div>
  );
}
