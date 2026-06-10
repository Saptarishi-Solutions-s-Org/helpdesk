"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Building2,
  Edit2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordPolicyNote } from "@/components/password-policy-note";
import { passwordSchema } from "@/lib/validators/password";
import GlobalLoader from "@/components/commoncomponents/globalloader";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="py-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <p className="mt-1 font-medium text-gray-900">{value || "-"}</p>
    </div>
  );
}

function PasswordInput({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <Input
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          required
          minLength={name === "newPassword" ? 8 : undefined}
          className="border-gray-300 pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((value) => !value)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data, mutate } = useSWR("/api/profile", fetcher);
  const profile = data?.profile;
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Unable to save profile");
    toast.success("Profile saved successfully");
    setEditing(false);
    mutate();
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    const parsed = passwordSchema.safeParse({
      currentPassword: form.get("currentPassword"),
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid password");
      return;
    }

    setPasswordLoading(true);
    const res = await fetch("/api/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setPasswordLoading(false);

    if (!res.ok) {
      return toast.error((await res.json()).message || "Unable to change password");
    }

    toast.success("Password updated successfully");
    event.currentTarget.reset();
  }

  if (!profile) {
    return <GlobalLoader />;
  }

  return (
    <main className="space-y-6 p-2 sm:p-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-lg font-semibold text-blue-700">
                {profile.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="text-center sm:text-left">
              <div className="mb-2 flex flex-col items-center gap-2 sm:flex-row">
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.name}
                </h2>
                <Badge className="w-fit border-0 bg-emerald-100 py-1 text-emerald-700">
                  Active
                </Badge>
              </div>
              <p className="mb-2 text-sm font-medium text-gray-600">
                {profile.designation || "SRS Helpdesk Client"}
              </p>
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 break-all text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Mail size={16} />
                {profile.email}
              </a>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  form="profile-form"
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 sm:flex-none"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-x-0 border-b-0 border-t-4 border-t-blue-600">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2">
                <UserCircle className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Basic Information
              </h3>
            </div>
            <div className="h-px bg-gray-200" />
          </CardHeader>
          <CardContent className="-mt-5">
            <form id="profile-form" onSubmit={saveProfile} className="space-y-0 divide-y divide-gray-200">
              <div className="py-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Full Name
                </label>
                {editing ? (
                  <Input
                    name="name"
                    defaultValue={profile.name}
                    required
                    placeholder="Enter full name"
                    className="mt-1 border-gray-300"
                  />
                ) : (
                  <p className="mt-1 font-medium text-gray-900">{profile.name}</p>
                )}
              </div>
              <DetailField label="Email" value={profile.email} />
              <div className="py-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Phone
                </label>
                {editing ? (
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      name="phone"
                      defaultValue={profile.phone || ""}
                      placeholder="Enter phone number"
                      className="border-gray-300 pl-9"
                    />
                  </div>
                ) : (
                  <p className="mt-1 font-medium text-gray-900">{profile.phone || "-"}</p>
                )}
              </div>
              <div className="py-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Designation
                </label>
                {editing ? (
                  <Input
                    name="designation"
                    defaultValue={profile.designation || ""}
                    placeholder="Enter designation"
                    className="mt-1 border-gray-300"
                  />
                ) : (
                  <p className="mt-1 font-medium text-gray-900">{profile.designation || "-"}</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-x-0 border-b-0 border-t-4 border-t-blue-600">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Account Security
              </h3>
            </div>
            <div className="h-px bg-gray-200" />
          </CardHeader>
          <CardContent className="-mt-5">
            <form onSubmit={changePassword} className="space-y-5">
              <PasswordPolicyNote />
              <PasswordInput
                label="Current Password"
                name="currentPassword"
                placeholder="Enter current password"
              />
              <PasswordInput
                label="New Password"
                name="newPassword"
                placeholder="Enter new password"
              />
              <PasswordInput
                label="Confirm Password"
                name="confirmPassword"
                placeholder="Confirm new password"
              />
              <Button
                disabled={passwordLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

    </main>
  );
}
