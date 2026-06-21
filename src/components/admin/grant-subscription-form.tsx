"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminGrantSubscriptionAction } from "@/server/actions/admin";

interface PlanOption {
  id: string;
  name: string;
}

export function GrantSubscriptionForm({ plans }: { plans: PlanOption[] }) {
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !planId) {
      toast.error("Nhập email và chọn gói.");
      return;
    }
    startTransition(async () => {
      const res = await adminGrantSubscriptionAction({ email: email.trim(), planId });
      if (res.ok) {
        toast.success("Đã cấp gói cho người dùng.");
        setEmail("");
      } else {
        toast.error(res.error ?? "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="grant-email">Email người dùng</Label>
        <Input
          id="grant-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@email.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="grant-plan">Gói</Label>
        <select
          id="grant-plan"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-64"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang cấp…" : "Cấp gói"}
      </Button>
    </form>
  );
}
