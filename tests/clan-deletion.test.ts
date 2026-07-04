import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    user: { findMany: vi.fn(), updateMany: vi.fn() },
    notification: { createMany: vi.fn() },
    marketplaceListing: { deleteMany: vi.fn() },
    clan: { delete: vi.fn() },
  };
  return {
    mockAuth: vi.fn(),
    txMock,
    prismaMock: { $transaction: vi.fn() },
  };
});
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { DELETE } from "../src/app/api/hub/admin/clans/route";

function delReq(body: object) {
  return new NextRequest("http://localhost/api/hub/admin/clans", {
    method: "DELETE", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockAuth.mockReset();
  prismaMock.$transaction.mockReset();
  Object.values(txMock).forEach(m => Object.values(m).forEach(fn => fn.mockReset()));
  txMock.user.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(txMock));
});

describe("Suppression de clan — autorisation", () => {
  it("refuse un non-admin hub (403)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" }, hubRole: "member" });
    const res = await DELETE(delReq({ id: "c1" }));
    expect(res.status).toBe(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("refuse sans id (400)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" }, hubRole: "admin" });
    const res = await DELETE(delReq({}));
    expect(res.status).toBe(400);
  });
});

describe("Suppression de clan — transaction complète", () => {
  beforeEach(() => mockAuth.mockResolvedValue({ user: { id: "admin1" }, hubRole: "admin" }));

  it("réinitialise les membres en sans-clan", async () => {
    await DELETE(delReq({ id: "c1" }));
    expect(txMock.user.updateMany).toHaveBeenCalledOnce();
    const arg = txMock.user.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ clanId: "c1" });
    expect(arg.data.clanId).toBeNull();
    expect(arg.data.permissionLevel).toBe(1);
    expect(arg.data.mandalorien).toBe(false);
  });

  it("crée une notification pour chaque ex-membre", async () => {
    txMock.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    await DELETE(delReq({ id: "c1" }));
    expect(txMock.notification.createMany).toHaveBeenCalledOnce();
    const data = txMock.notification.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0].type).toBe("clan_dissolved");
  });

  it("ne crée aucune notification si le clan n'a aucun membre", async () => {
    txMock.user.findMany.mockResolvedValue([]);
    await DELETE(delReq({ id: "c1" }));
    expect(txMock.notification.createMany).not.toHaveBeenCalled();
  });

  it("supprime les annonces marketplace du clan avant le clan", async () => {
    await DELETE(delReq({ id: "c1" }));
    expect(txMock.marketplaceListing.deleteMany).toHaveBeenCalledWith({ where: { clanId: "c1" } });
  });

  it("supprime le clan en dernier (cascade)", async () => {
    await DELETE(delReq({ id: "c1" }));
    expect(txMock.clan.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    // ordre : reset membres AVANT suppression clan
    const resetOrder = txMock.user.updateMany.mock.invocationCallOrder[0];
    const listingsOrder = txMock.marketplaceListing.deleteMany.mock.invocationCallOrder[0];
    const deleteOrder = txMock.clan.delete.mock.invocationCallOrder[0];
    expect(resetOrder).toBeLessThan(deleteOrder);
    expect(listingsOrder).toBeLessThan(deleteOrder);
  });

  it("effectue tout dans une transaction atomique", async () => {
    await DELETE(delReq({ id: "c1" }));
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});
