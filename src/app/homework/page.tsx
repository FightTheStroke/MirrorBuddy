import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Aiuto Compiti | MirrorBuddy",
};

export default function HomeworkPage() {
  redirect("/supporti");
}
