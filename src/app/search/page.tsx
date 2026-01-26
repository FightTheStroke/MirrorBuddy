import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ricerca | MirrorBuddy",
};

export default function Page() {
  redirect("/?view=astuccio");
}
