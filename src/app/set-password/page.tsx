import { Suspense } from "react";
import { PasswordTokenPage } from "@/components/password-token-page";

export default function SetPasswordPage() {
  return (
    <Suspense>
      <PasswordTokenPage
        endpoint="/api/auth/set-password"
        title="Set password"
        subtitle="Finish your SRS Helpdesk account setup"
      />
    </Suspense>
  );
}
