import { LoginForm } from "@/components/auth-form";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Fingerprint } from "lucide-react";

const TRUST_POINTS = [
  "Client issue tracking",
  "Bug and CR lifecycle",
  "Realtime support updates",
];

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAFAF7] font-[var(--font-poppins)] text-[#161616]">
      <div className="pointer-events-none absolute right-[-180px] top-[-180px] h-[520px] w-[520px] rounded-full border border-[#e4dfd5]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-220px] h-[560px] w-[560px] rounded-full border border-[#e8e2d8]" />

      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <Image
          src="/saptarishi.png"
          alt="Saptarishi Solutions"
          width={100}
          height={30}
          priority
          className="hidden md:block"
        />
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-7xl items-center gap-10 px-5 pb-12 pt-2 md:px-10 lg:grid-cols-[1.08fr_440px]">
        <section className="hidden lg:block">
          <h1
            className="max-w-3xl text-[clamp(46px,5.8vw,82px)] font-bold leading-[1.06] text-[#111]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Client support, beautifully organized.
          </h1>

          <div className="mt-9 flex flex-wrap gap-3">
            {TRUST_POINTS.map((point) => (
              <span
                key={point}
                className="inline-flex items-center gap-2 rounded-full border border-[#e5ded3] bg-[#fffdf9]/80 px-4 py-2 text-xs font-medium text-[#57514b]"
              >
                <BadgeCheck className="h-3.5 w-3.5 text-[#2D6A4F]" />
                {point}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[400px]">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#e6dfd4] bg-white/88 p-2 shadow-[0_30px_90px_rgba(37,29,18,0.15)] backdrop-blur">
            <div className="rounded-[1.55rem] bg-[#1a1a1a] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-white/55">SRS Helpdesk</p>
                  <h2
                    className="mt-1 text-2xl font-bold"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Welcome back
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
                  <Image
                    src="/sap.png"
                    alt="Saptarishi"
                    width={34}
                    height={34}
                    priority
                    className="h-8 w-8 object-contain"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                <Fingerprint className="h-5 w-5 text-[#C4B5FD]" />
                <p className="text-xs leading-5 text-white/68">
                  Secure access for Saptarishi support and client issue workflows.
                </p>
              </div>
            </div>

            <div className="px-6 pb-7 pt-6">
              <LoginForm />
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-6 text-[#8a8379]">
            This portal is for registered SRS Helpdesk users only.
          </p>
        </section>
      </main>
    </div>
  );
}
