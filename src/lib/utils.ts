import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
export function formatMoney(cents: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(cents / 100);
}
export function formatPoints(n: number): string {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
    }).format(n);
}
export function brandLabel(brand: string): string {
    const map: Record<string, string> = {
        visa: "Visa",
        mastercard: "Mastercard",
        amex: "Amex",
        discover: "Discover",
    };
    return map[brand] ?? brand;
}
