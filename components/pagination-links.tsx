import Link from "next/link";

import { totalPages } from "@/lib/pagination";

export function PaginationLinks({
  pathname,
  page,
  pageSize,
  total,
  params = {},
}: {
  pathname: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string | undefined>;
}) {
  const pages = totalPages(total, pageSize);
  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    search.set("page", String(target));
    return `${pathname}?${search.toString()}`;
  };
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
      <p>{total} résultat(s) · page {page} sur {pages}</p>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} className={`button-secondary ${page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={href(Math.max(1, page - 1))}>Précédent</Link>
        <Link aria-disabled={page >= pages} className={`button-secondary ${page >= pages ? "pointer-events-none opacity-50" : ""}`} href={href(Math.min(pages, page + 1))}>Suivant</Link>
      </div>
    </div>
  );
}
