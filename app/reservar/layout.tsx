import type { ReactNode } from "react";
import { reservarMetadata } from "@/lib/seo-public";

export const metadata = reservarMetadata;

export default function ReservarLayout({ children }: { children: ReactNode }) {
  return children;
}
