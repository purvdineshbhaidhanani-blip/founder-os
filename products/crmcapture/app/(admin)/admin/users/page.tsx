"use client";

import { useEffect, useState } from "react";
import { UsersPanel, type AdminUserRow } from "@founder-os/ui/admin";
import { useToast } from "@founder-os/ui/primitives";

interface Member {
  userId: string;
  role: "owner" | "admin" | "member";
  user: { id: string; email: string; displayName: string; status: string };
}

export default function AdminUsersPage() {
  const { show } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const response = await fetch("/api/admin/members");
    const body = await response.json();
    if (response.ok) setMembers(body.data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rows: AdminUserRow[] = members.map((m) => ({
    id: m.userId,
    name: m.user.displayName,
    email: m.user.email,
    role: m.role,
    status: m.user.status === "active" ? "active" : m.user.status === "invited" ? "invited" : "deactivated",
  }));

  async function handleRoleChange(userId: string, role: string) {
    const response = await fetch(`/api/admin/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const body = await response.json();
      show({ title: "Couldn't update role", description: body.error?.message, variant: "destructive" });
      return;
    }
    load();
  }

  async function handleRemove(userId: string) {
    const response = await fetch(`/api/admin/members/${userId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      show({ title: "Couldn't remove member", description: body.error?.message, variant: "destructive" });
      return;
    }
    show({ title: "Member removed", variant: "success" });
    load();
  }

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Users</h1>
      </div>
      <UsersPanel
        users={rows}
        roleOptions={[{ value: "owner", label: "Owner" }, { value: "admin", label: "Admin" }, { value: "member", label: "Member" }]}
        isLoading={isLoading}
        onRoleChange={handleRoleChange}
        onDeactivate={handleRemove}
        canManage={true}
      />
    </div>
  );
}
