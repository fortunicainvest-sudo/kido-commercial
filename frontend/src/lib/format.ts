export function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Gratuit";
  const amount = cents / 100;
  if (currency === "XOF") return `${amount.toLocaleString("fr-FR")} FCFA`;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "Bientôt";
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
