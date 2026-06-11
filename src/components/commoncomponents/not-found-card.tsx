import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotFoundCardProps = {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
};

export function NotFoundCard({ title, description, actionHref, actionLabel }: NotFoundCardProps) {
  return (
    <main className="flex min-h-full items-center justify-center bg-white p-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <Button asChild className="mt-6 rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>
    </main>
  );
}
