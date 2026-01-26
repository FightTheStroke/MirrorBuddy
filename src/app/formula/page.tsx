import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Formula | MirrorBuddy",
};

export default function Page() {
  redirect("/?view=astuccio");
}
