import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Webcam | MirrorBuddy",
};

export default function Page() {
  redirect("/?view=astuccio");
}
