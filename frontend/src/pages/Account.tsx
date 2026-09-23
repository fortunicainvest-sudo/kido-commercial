import { useAuth } from "../lib/auth-context";

export function Account() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold text-text">{user.name}</h1>
      <p className="mt-1 text-muted">{user.email}</p>
      <p className="mt-4 inline-block rounded-full bg-panel-raised px-3 py-1 text-sm font-semibold text-text">
        Plan {user.plan}
      </p>
      {user.bio && <p className="mt-4 text-muted">{user.bio}</p>}
    </div>
  );
}
