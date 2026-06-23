export function formatNpr(amount: number): string {
  return `₨ ${Math.round(amount).toLocaleString("en-US")}`;
}

export function capacityLabel(assigned: number, capacity: number): string {
  return capacity > 0 ? `${assigned}/${capacity}` : `${assigned}`;
}

export function isFull(assigned: number, capacity: number): boolean {
  return capacity > 0 && assigned >= capacity;
}
