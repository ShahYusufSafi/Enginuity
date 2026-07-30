/**
 * Navigation item contract.
 *
 * Nav items are *declarative destinations*, not imperative actions: they carry
 * a router `path` and the NavBar renders a <NavLink>. This is deliberate —
 * the previous `action: () => window.location.href = ...` shape forced a full
 * page reload on every nav click (dropping SPA state and re-mounting Clerk),
 * and made the "current page" style impossible to apply.
 */
export interface NavItem {
  /** React key + stable identifier. */
  id: string;
  /** Visible label. */
  name: string;
  /** Router path this item navigates to. Must exist in AppRoutes.tsx. */
  path: string;
  /** Tooltip / accessible description. */
  title?: string;
}
