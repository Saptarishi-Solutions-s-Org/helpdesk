"use client";

import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ErrorAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionText?: string;
};

export function ErrorAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  actionText = "OK",
}: ErrorAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[360px] max-w-[90vw] rounded-3xl border-0 bg-white p-4 shadow-xl">
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
          <AlertDialogDescription className="mt-[-5px] text-center text-xs text-gray-600">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center">
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="w-full rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
