import { TableCell, TableRow } from "@/components/ui/table";

type TableStateRowProps = {
  colSpan: number;
  type: "loading" | "empty";
  emptyMessage?: string;
};

export function TableStateRow({
  colSpan,
  type,
  emptyMessage = "No records found.",
}: TableStateRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-gray-500">
        {type === "loading" ? "Loading..." : emptyMessage}
      </TableCell>
    </TableRow>
  );
}
