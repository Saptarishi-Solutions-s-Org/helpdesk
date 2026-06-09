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

export function LogoutConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[250px] max-w-[90vw] rounded-3xl border-0 bg-white p-4 shadow-xl">
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
            Logging Out
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-[-5px] text-center text-xs text-gray-600">
            Are you sure you want to log out?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-center gap-2">
          <AlertDialogCancel className="flex-1 rounded-md border border-indigo-600 px-1 py-1 text-xs text-indigo-600 hover:bg-indigo-50">
            No
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 rounded-md bg-indigo-600 px-1 py-1 text-xs text-white hover:bg-indigo-700"
          >
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
