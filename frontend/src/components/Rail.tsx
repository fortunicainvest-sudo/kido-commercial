import type { ReactNode } from "react";

export function Rail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 px-6 text-lg font-bold text-text md:px-10">{title}</h2>
      <div className="rail flex gap-4 overflow-x-auto px-6 pb-2 md:px-10">
        {children}
      </div>
    </section>
  );
}
