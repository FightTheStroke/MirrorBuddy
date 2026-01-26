import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Demo | MirrorBuddy",
};

export default function DemoPage() {
  redirect("/?view=astuccio");
}
