import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "PDF | MirrorBuddy",
};

export default function PdfPage() {
  redirect("/?view=astuccio");
}
