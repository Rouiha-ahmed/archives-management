import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/(protected)/error";
import Loading from "@/app/(protected)/loading";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

describe("shared interface states", () => {
  it("announces protected-route loading without relying on animation", () => {
    const html = renderToStaticMarkup(<Loading />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Chargement en cours");
  });

  it("renders a recoverable error as an alert", () => {
    const html = renderToStaticMarkup(<ErrorPage error={new Error("synthetic")} reset={vi.fn()} />);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Une erreur est survenue");
    expect(html).toContain("Réessayer");
    expect(html).not.toContain("synthetic");
  });

  it("provides textual empty and status information", () => {
    const empty = renderToStaticMarkup(<EmptyState title="Aucun résultat" description="Modifiez les filtres." />);
    const status = renderToStaticMarkup(<StatusBadge value="EN_ATTENTE" />);

    expect(empty).toContain("Aucun résultat");
    expect(empty).toContain("Modifiez les filtres.");
    expect(status).toContain("En attente");
  });
});
