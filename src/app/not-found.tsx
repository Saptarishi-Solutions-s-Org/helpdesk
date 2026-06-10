"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Home, LifeBuoy } from "lucide-react";

const STARS = [
  { id: 0, cx: 0.18, cy: 0.62, label: "Dubhe", size: 5, lost: false },
  { id: 1, cx: 0.28, cy: 0.48, label: "Merak", size: 4, lost: false },
  { id: 2, cx: 0.4, cy: 0.4, label: "Phecda", size: 4.5, lost: false },
  { id: 3, cx: 0.52, cy: 0.44, label: "Megrez", size: 3.5, lost: true },
  { id: 4, cx: 0.63, cy: 0.36, label: "Alioth", size: 5, lost: false },
  { id: 5, cx: 0.76, cy: 0.32, label: "Mizar", size: 4, lost: false },
  { id: 6, cx: 0.88, cy: 0.26, label: "Alkaid", size: 4.5, lost: false },
];

const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [0, 2],
];

const BG_DOTS = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 53 + 7) % 100}%`,
  size: (index % 3) + 1,
  opacity: 0.06 + (index % 4) * 0.03,
}));

const QUICK_LINKS = [
  { label: "Login", href: "/login" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Issues", href: "/dashboard/issues" },
];

export default function NotFoundPage() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <main
      className="relative flex min-h-screen select-none flex-col items-center justify-center overflow-hidden px-5 py-16"
      style={{ background: "#FAFAF7", fontFamily: "var(--font-poppins)" }}
    >
      {BG_DOTS.map((dot) => (
        <span
          key={dot.id}
          className="pointer-events-none absolute rounded-full bg-[#8B5CF6]"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
          }}
        />
      ))}

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute right-[-240px] top-[-200px] h-[680px] w-[680px] rounded-full border border-[#e4e0d8]" />
        <div className="absolute right-[-100px] top-[-70px] h-[420px] w-[420px] rounded-full border border-[#ede9e0]" />
        <div className="absolute bottom-[-180px] left-[-200px] h-[560px] w-[560px] rounded-full border border-[#e8e4da]" />
      </div>

      <div
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="mb-10 flex justify-center">
          <div className="relative h-[38px] w-[130px]">
            <Image
              src="/saptarishi.png"
              alt="Saptarishi Solutions"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="mb-14 grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <span
                className="font-bold leading-none text-[#f0ece4]"
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontSize: "clamp(100px, 18vw, 180px)",
                }}
              >
                404
              </span>
            </div>

            <svg viewBox="0 0 400 280" width="100%" className="relative z-10 overflow-visible">
              {CONNECTIONS.map(([first, second], index) => {
                const starOne = STARS[first];
                const starTwo = STARS[second];
                const bothExist = !starOne.lost && !starTwo.lost;

                return (
                  <line
                    key={index}
                    x1={starOne.cx * 400}
                    y1={starOne.cy * 280}
                    x2={starTwo.cx * 400}
                    y2={starTwo.cy * 280}
                    stroke={bothExist ? "#C4B5FD" : "#e8e4da"}
                    strokeWidth={bothExist ? 0.8 : 0.6}
                    strokeDasharray={bothExist ? "none" : "3 4"}
                    strokeOpacity={bothExist ? 0.7 : 0.5}
                  />
                );
              })}

              {STARS.map((star) => (
                <g
                  key={star.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(star.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {hovered === star.id && !star.lost ? (
                    <circle
                      cx={star.cx * 400}
                      cy={star.cy * 280}
                      r={star.size * 3.5}
                      fill="#8B5CF6"
                      fillOpacity="0.12"
                    />
                  ) : null}

                  {star.lost ? (
                    <>
                      <circle
                        cx={star.cx * 400}
                        cy={star.cy * 280}
                        r={star.size * 2.2}
                        fill="none"
                        stroke="#C4B5FD"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.6"
                      />
                      <text
                        x={star.cx * 400}
                        y={star.cy * 280 + 4}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#C4B5FD"
                        fontFamily="var(--font-playfair), Georgia, serif"
                        fontWeight="700"
                        opacity="0.7"
                      >
                        ?
                      </text>
                    </>
                  ) : (
                    <circle
                      cx={star.cx * 400}
                      cy={star.cy * 280}
                      r={hovered === star.id ? star.size * 1.6 : star.size}
                      fill={hovered === star.id ? "#8B5CF6" : "#1a1a1a"}
                      style={{ transition: "r 0.2s ease, fill 0.2s ease" }}
                    />
                  )}

                  {hovered === star.id ? (
                    <text
                      x={star.cx * 400}
                      y={star.cy * 280 - star.size * 2.5 - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill={star.lost ? "#C4B5FD" : "#8B5CF6"}
                      fontFamily="var(--font-poppins), sans-serif"
                      fontWeight="600"
                    >
                      {star.label.toUpperCase()}
                    </text>
                  ) : null}
                </g>
              ))}

              <text
                x="200"
                y="258"
                textAnchor="middle"
                fontSize="8"
                fill="#c0bab2"
                fontFamily="var(--font-poppins), sans-serif"
                fontWeight="600"
              >
                SAPTARISHI SUPPORT
              </text>
            </svg>
          </div>

          <div>
            <div className="mb-7 flex items-center gap-3">
              <span className="h-[1.5px] w-8 bg-[#8B5CF6]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B5CF6]">
                Error 404
              </span>
            </div>

            <h1
              className="mb-5 text-[clamp(36px,5vw,64px)] font-bold leading-[1.07] text-[#111]"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              This page{" "}
              <span className="italic text-[#8B5CF6]">
                wandered off.
              </span>
            </h1>

            <p className="mb-8 max-w-sm text-[14px] leading-[1.9] text-[#777]">
              The support page you are looking for may have moved, been renamed,
              or never existed at this address.
            </p>

            <div className="mb-10 flex flex-wrap gap-3">
              <Link
                href="/"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#1a1a1a] px-7 py-3.5 text-[13px] font-semibold tracking-wide text-white transition-all duration-200 hover:scale-[1.02] hover:bg-[#111]"
              >
                <Home size={14} />
                Back to Home
              </Link>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2.5 rounded-full border border-[#d0ccc4] px-7 py-3.5 text-[13px] font-semibold tracking-wide text-[#333] transition-all duration-200 hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
              >
                <LifeBuoy size={14} />
                Helpdesk
                <ArrowUpRight
                  size={13}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e8e4da]" />
              <span className="text-[11px] tracking-wide text-[#aaa]">or navigate to</span>
              <div className="h-px flex-1 bg-[#e8e4da]" />
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-[#ddd8d0] px-3.5 py-1.5 text-[11px] font-semibold text-[#666] transition-all duration-200 hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#e8e4da] pt-8 sm:flex-row">
          <p className="text-[11px] tracking-wide text-[#c0bab2]">
            Saptarishi Solutions Pvt. Ltd.
          </p>
          <p className="text-[11px] text-[#c0bab2]">
            SRS Helpdesk and Support
          </p>
        </div>
      </div>
    </main>
  );
}
