import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export default function NotAuthorizedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAFAF7] px-6 py-10 font-[var(--font-poppins)]">
      <div className="pointer-events-none absolute right-[-180px] top-[-180px] h-[520px] w-[520px] rounded-full border border-[#e4dfd5]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-220px] h-[560px] w-[560px] rounded-full border border-[#e8e2d8]" />

      <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[#e6dfd4] bg-white/90 p-2 shadow-[0_30px_90px_rgba(37,29,18,0.15)] backdrop-blur">
        <div className="rounded-[1.55rem] bg-[#1a1a1a] px-6 py-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-white/55">SRS Helpdesk</p>
              <h1
                className="mt-1 text-2xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Access restricted
              </h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Image src="/sap.png" alt="Saptarishi" width={34} height={34} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <LockKeyhole className="h-5 w-5 text-[#C4B5FD]" />
            <p className="text-xs leading-5 text-white/68">
              Your account does not have permission to open this area.
            </p>
          </div>
        </div>

        <div className="px-6 pb-7 pt-6 text-center">
          <Image
            src="/saptarishi.png"
            alt="Saptarishi Solutions"
            width={130}
            height={42}
            className="mx-auto mb-5 object-contain"
            priority
          />
          <p className="text-sm leading-6 text-[#625b53]">
            If this looks incorrect, please contact your SRS Helpdesk
            administrator.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
