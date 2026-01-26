import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Linea Temporale | MirrorBuddy",
};

export default function Page() {
  redirect("/?view=astuccio");
}
