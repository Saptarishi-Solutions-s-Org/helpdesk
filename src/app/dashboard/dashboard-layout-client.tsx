"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  BellRing,
  Boxes,
  Building2,
  Check,
  CheckCheck,
  ExternalLink,
  FolderKanban,
  Home,
  LogOut,
  Ticket,
} from "lucide-react";
import { LogoutConfirmationDialog } from "@/components/commoncomponents/logout-confirmation-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRealtime } from "@/hooks/useRealtime";
import { cn, formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type SessionPayload = {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "CLIENT";
  } | null;
};

type ProfilePayload = {
  profile?: {
    name?: string | null;
    email?: string | null;
  };
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt?: string;
};

type NotificationRealtimePayload = {
  eventType?: string;
  new?: {
    recipient_id?: string;
    title?: string;
    message?: string;
    link?: string | null;
  };
};

const userLinks = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/issues", label: "Issues", icon: Ticket },
];

const adminLinks = [
  ...userLinks,
  { href: "/dashboard/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/dashboard/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/admin/modules", label: "Modules", icon: Boxes },
];

function SidebarBrand() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <div className="flex h-12 items-center justify-center">
      <Image
        src={collapsed ? "/sap.png" : "/saptarishi.png"}
        alt="Saptarishi Solutions"
        width={collapsed ? 26 : 96}
        height={collapsed ? 26 : 32}
        priority
        className="object-contain"
      />
    </div>
  );
}

function isSidebarHrefActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function cleanNotificationText(value?: string | null) {
  if (!value) return "";
  return value.replace(/\b[A-Z]+(?:_[A-Z]+)+\b/g, (match) => formatStatus(match));
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const notificationSeededRef = useRef(false);
  const { data: sessionData, mutate: mutateSession } = useSWR<SessionPayload>("/api/auth/session", fetcher);
  const user = sessionData?.user;
  const links = user?.role === "ADMIN" ? adminLinks : userLinks;
  const { data, mutate } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 5000,
  });
  const { data: profileData, mutate: mutateProfile } = useSWR<ProfilePayload>(
    "/api/profile",
    fetcher,
  );
  const displayName = profileData?.profile?.name || user?.name || "SRS Helpdesk";

  useRealtime(["notifications"], (payload) => {
    void mutate();

    const notificationPayload = payload as NotificationRealtimePayload;
    const row = notificationPayload.new;
    if (notificationPayload.eventType !== "INSERT") return;
    if (!row || row.recipient_id !== user?.id) return;

    toast.info(row.title || "New notification", {
      description: cleanNotificationText(row.message),
      duration: 3500,
      action: row.link
        ? {
            label: "Open",
            onClick: () => router.push(row.link!),
          }
        : undefined,
    });
  });

  useRealtime(["users", "organizations"], () => {
    void mutateSession();
    void mutateProfile();
  });

  useEffect(() => {
    if (sessionData && !sessionData.user) {
      router.replace("/login");
      router.refresh();
    }
  }, [router, sessionData]);

  useEffect(() => {
    const notifications = (data?.notifications ?? []) as NotificationRow[];
    if (!notifications.length) return;

    if (!notificationSeededRef.current) {
      seenNotificationIdsRef.current = new Set(
        notifications.map((notification) => notification.id),
      );
      notificationSeededRef.current = true;
      return;
    }

    const freshUnread = notifications
      .filter((notification) => !seenNotificationIdsRef.current.has(notification.id))
      .filter((notification) => !notification.isRead)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    notifications.forEach((notification) => {
      seenNotificationIdsRef.current.add(notification.id);
    });

    freshUnread.slice(0, 3).forEach((notification) => {
      toast.info(notification.title || "New notification", {
        description: cleanNotificationText(notification.message),
        duration: 3500,
        action: notification.link
          ? {
              label: "Open",
              onClick: () => router.push(notification.link!),
            }
          : undefined,
      });
    });
  }, [data?.notifications, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="bg-white">
        <SidebarHeader className="border-b bg-white">
          <SidebarBrand />
        </SidebarHeader>
        <SidebarContent className="bg-white">
          <SidebarGroup className="border-t-0 pt-2">
            <SidebarGroupLabel>Support</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((item) => {
                  const active = isSidebarHrefActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          active
                            ? "bg-blue-50 font-medium text-blue-700 hover:bg-blue-50 hover:text-blue-700 [&>svg]:text-blue-600"
                            : "text-slate-700 hover:bg-gray-100 hover:text-slate-900 [&>svg]:text-gray-500",
                        )}
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4 text-slate-500" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t bg-white">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Logout"
                onClick={() => setLogoutOpen(true)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="h-screen overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-700">
                SRS-Help Desk
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100">
                  <BellRing className="h-5 w-5" />
                  {data?.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {data.unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!data?.unreadCount}
                    className="h-7 gap-1 px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:text-slate-400"
                    onClick={async () => {
                      await fetch("/api/notifications/read-all", { method: "PATCH" });
                      void mutate();
                    }}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Read all
                  </Button>
                </div>
                <div className="max-h-96 overflow-y-auto py-1">
                  {(data?.notifications ?? []).length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    data.notifications.map((note: NotificationRow) => (
                      <div
                        key={note.id}
                        className={cn(
                          "border-b px-3 py-2 transition last:border-b-0",
                          note.isRead ? "bg-white" : "bg-blue-50/70",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!note.isRead && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-5 text-slate-800">
                              {cleanNotificationText(note.title)}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">
                              {cleanNotificationText(note.message)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-center gap-2">
                            {!note.isRead && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/notifications/${note.id}/read`, { method: "PATCH" });
                                  void mutate();
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50"
                                aria-label="Mark notification as read"
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {note.link && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!note.isRead) {
                                    await fetch(`/api/notifications/${note.id}/read`, { method: "PATCH" });
                                    void mutate();
                                  }
                                  router.push(note.link!);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 transition hover:bg-blue-50"
                                aria-label="Open notification link"
                                title="Open"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => router.push("/dashboard/profile")}
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100"
              aria-label="Open profile"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left text-xs sm:block">
                <span className="block font-semibold">{displayName}</span>
              </span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </SidebarInset>
      <LogoutConfirmationDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => {
          setLogoutOpen(false);
          void logout();
        }}
      />
    </SidebarProvider>
  );
}
