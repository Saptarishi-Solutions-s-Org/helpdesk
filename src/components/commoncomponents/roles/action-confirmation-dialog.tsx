"use client";

import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ActionConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  keepOpenOnConfirm?: boolean;
};

export function ActionConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Yes",
  cancelText = "No",
  isLoading = false,
  keepOpenOnConfirm = false,
}: ActionConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[260px] max-w-[90vw] bg-white rounded-3xl border-0 shadow-xl p-4">
        <AlertDialogHeader className="text-center">
          <div className="flex justify-center">
            <Image
              src="/saptarishi.png"
              alt="Saptarishi"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>

          <AlertDialogTitle className="text-center text-base font-semibold text-gray-900">
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-center text-xs text-gray-600 mt-[-5px]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-row justify-center gap-2">
          <AlertDialogCancel
            disabled={isLoading}
            className="flex-1 rounded-md border border-indigo-600 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 !border-indigo-600 !text-indigo-600 hover:!bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={(event) => {
              if (keepOpenOnConfirm) {
                event.preventDefault();
              }
              onConfirm();
            }}
            disabled={isLoading}
            className="flex-1 rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
