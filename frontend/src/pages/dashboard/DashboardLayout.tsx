import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/tableau-de-bord", label: "Événements", end: true },
  { to: "/tableau-de-bord/billetterie", label: "Billetterie & ventes" },
  { to: "/tableau-de-bord/analytique", label: "Analytique & revenus" },
  { to: "/tableau-de-bord/abonnement", label: "Mon abonnement" },
];

export function DashboardLayout() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <h1 className="text-2xl font-bold text-text">Tableau de bord</h1>
      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <NavLink
            key={t.to} to={t.to} end={t.end}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
                isActive ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
