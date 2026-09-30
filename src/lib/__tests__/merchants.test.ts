import { describe, expect, it } from "vitest";
import { resolveMerchant, searchMerchants } from "../merchants";
describe("resolveMerchant", () => {
    it("maps Amazon to online shopping not grocery", () => {
        const r = resolveMerchant("Amazon");
        expect(r.merchant).toBe("Amazon");
        expect(r.category).toBe("online");
        expect(r.matched).toBe(true);
    });
    it("maps Whole Foods to grocery", () => {
        const r = resolveMerchant("whole foods");
        expect(r.merchant).toBe("Whole Foods");
        expect(r.category).toBe("grocery");
    });
    it("maps Shell to gas", () => {
        expect(resolveMerchant("shell").category).toBe("gas");
    });
    it("keeps unknown merchants unmatched", () => {
        const r = resolveMerchant("Obscure Local Cafe");
        expect(r.matched).toBe(false);
        expect(r.merchant).toBe("Obscure Local Cafe");
    });
});
describe("searchMerchants", () => {
    it("ranks exact Amazon above Amazon Fresh", () => {
        const hits = searchMerchants("amazon");
        expect(hits[0]?.name).toBe("Amazon");
    });
});
