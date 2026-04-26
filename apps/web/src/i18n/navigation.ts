import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

export const redirectLocale = (href: string, locale: string) => {
  redirect({ href, locale });
};
