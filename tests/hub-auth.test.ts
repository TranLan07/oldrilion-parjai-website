import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("../src/lib/auth", () => ({ auth: () => mockAuth() }));

import { requireHubAdmin, hubDenied } from "../src/lib/hub-auth";

describe("requireHubAdmin", () => {
  beforeEach(() => mockAuth.mockReset());

  it("refuse sans session", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await requireHubAdmin()).toBeNull();
  });

  it("refuse un membre simple", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" }, hubRole: "member" });
    expect(await requireHubAdmin()).toBeNull();
  });

  it("accepte un admin hub", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" }, hubRole: "admin" });
    expect(await requireHubAdmin()).not.toBeNull();
  });

  it("accepte un modérateur hub", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" }, hubRole: "moderator" });
    expect(await requireHubAdmin()).not.toBeNull();
  });

  it("refuse un rôle inconnu", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" }, hubRole: "webmaster" });
    expect(await requireHubAdmin()).toBeNull();
  });

  it("hubDenied() renvoie un 403", () => {
    expect(hubDenied().status).toBe(403);
  });
});
