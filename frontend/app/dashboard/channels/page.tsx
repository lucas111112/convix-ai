"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Channels are now configured per-agent inside the agent Edit modal → Channels tab.
export default function ChannelsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/agents"); }, [router]);
  return null;
}
