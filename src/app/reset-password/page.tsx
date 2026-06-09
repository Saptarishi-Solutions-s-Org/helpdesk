import { Suspense } from "react";
import { PasswordTokenPage } from "@/components/password-token-page";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <PasswordTokenPage
        endpoint="/api/auth/reset-password"
        title="Reset password"
        subtitle="Enter your new password below"
      />
    </Suspense>
  );
}
