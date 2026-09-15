"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRequestAction } from "@/lib/actions/requests";
import {
  REQUEST_CATEGORIES,
  REQUEST_PRIORITIES,
  REQUEST_TYPES,
  type RequestPriority,
  type RequestType,
} from "@/config/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function NewRequestClient() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestType>("item");
  const [category, setCategory] = useState<string>(REQUEST_CATEGORIES[0]);
  const [priority, setPriority] = useState<RequestPriority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("0");

  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("request_type", requestType);
    formData.append("category", category);
    formData.append("priority", priority);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("amount_requested", amount);

    startTransition(async () => {
      const res = await createRequestAction(undefined, formData);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        setTimeout(() => {
          router.push("/requests");
        }, 1200);
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    });
  };

  return (
    <Card className="shadow-xs border-border">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PlusCircle className="size-4 text-primary" />
          Requisition Form
        </CardTitle>
        <Button render={<Link href="/requests" />} variant="ghost" size="xs">
          <ArrowLeft className="size-3.5 mr-1" /> Back
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Request Nature</Label>
              <div className="grid grid-cols-2 gap-2">
                {REQUEST_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRequestType(t)}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold border text-center transition-all capitalize ${
                      requestType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "item" ? "Physical Items" : "Money / Expense"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catSel" className="text-xs font-semibold">Category</Label>
              <select
                id="catSel"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {REQUEST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold">Requisition Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Science Lab Reagent Refill or Whiteboard Markers"
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs font-semibold">Description & Purpose</Label>
            <Textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation of why these items or funds are necessary..."
              required
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amt" className="text-xs font-semibold">Estimated Cost (GH₵)</Label>
              <Input
                id="amt"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pri" className="text-xs font-semibold">Priority Level</Label>
              <select
                id="pri"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                {REQUEST_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                feedback.isError
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Submitting Requisition..." : "Submit for Executive Review"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
