export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

function positiveInteger(value: string | undefined, fallback = 1) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function pagination(pageValue?: string, pageSizeValue?: string) {
  const page = positiveInteger(pageValue, 1);
  const pageSize = Math.min(
    positiveInteger(pageSizeValue, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function totalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
