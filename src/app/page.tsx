import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessageSquareText, ShieldCheck, TicketCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAFAF7] font-[var(--font-poppins)] text-[#161616]">
      <div className="pointer-events-none absolute right-[-180px] top-[-180px] h-[520px] w-[520px] rounded-full border border-[#e4dfd5]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-220px] h-[560px] w-[560px] rounded-full border border-[#e8e2d8]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Image
          src="/saptarishi.png"
          alt="Saptarishi Solutions"
          width={118}
          height={36}
          priority
        />
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111]"
        >
          Login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-7xl items-center gap-10 px-5 pb-12 md:px-10 lg:grid-cols-[1.08fr_420px]">
        <section>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e5ded3] bg-white/70 px-4 py-2 text-xs font-semibold text-[#57514b]">
            <ShieldCheck className="h-4 w-4 text-[#2D6A4F]" />
            Saptarishi support center
          </p>
          <h1
            className="max-w-4xl text-[clamp(44px,5.8vw,82px)] font-bold leading-[1.06] text-[#111]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            A cleaner help desk for bugs, CRs, and client support.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#625b53]">
            Raise issues, attach screenshots or videos, track opened and closed
            items, and follow every comment and status change from one support
            workspace.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {["Configured project/module routing", "Realtime notifications", "Complete issue history"].map((point) => (
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

        <section className="rounded-[2rem] border border-[#e6dfd4] bg-white/88 p-2 shadow-[0_30px_90px_rgba(37,29,18,0.15)] backdrop-blur">
          <div className="rounded-[1.55rem] bg-[#1a1a1a] p-6 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Image src="/sap.png" alt="Saptarishi" width={34} height={34} />
            </div>
            <h2 className="mt-6 text-2xl font-bold">SRS Helpdesk</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Built for Saptarishi teams and client companies to keep support
              conversations structured, traceable, and fast.
            </p>
          </div>
          <div className="grid gap-3 p-5">
            {[
              { icon: TicketCheck, label: "Opened and closed issue views" },
              { icon: MessageSquareText, label: "Comments and activity timeline" },
              { icon: ShieldCheck, label: "Admin triage with project/module" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#eee7dc] bg-[#fffdf9] p-4 text-sm font-medium text-[#34302c]">
                <item.icon className="h-5 w-5 text-indigo-600" />
                {item.label}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
