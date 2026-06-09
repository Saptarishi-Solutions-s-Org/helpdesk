import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  tone = "text-slate-900",
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
