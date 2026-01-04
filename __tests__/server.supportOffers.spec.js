import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const buildReq = ({
  method = "GET",
  url = "/api/support/offer-complete",
  body = "",
  headers = {}
} = {}) => ({
  method,
  url,
  headers: { host: "localhost", ...headers },
  [Symbol.asyncIterator]: async function* () {
    if (body) yield Buffer.from(body);
  }
});

const buildRes = () => ({
  status: null,
  headers: {},
  body: "",
  writeHead(status, headers) {
    this.status = status;
    this.headers = headers;
  },
  setHeader(name, value) {
    this.headers[name] = value;
  },
  end(chunk) {
    this.body += chunk ?? "";
  }
});

const parseBody = (res) => JSON.parse(res.body || "{}");

let prevToken;

beforeEach(() => {
  prevToken = process.env.SUPPORT_REWARD_TOKEN;
});

afterEach(() => {
  process.env.SUPPORT_REWARD_TOKEN = prevToken;
  vi.restoreAllMocks();
});

async function importServer() {
  vi.resetModules();
  const server = await import("../server.cjs");
  return server;
}

describe("support offer completion", () => {
  it("rejects callbacks without a valid token when configured", async () => {
    process.env.SUPPORT_REWARD_TOKEN = "secret-token";
    const server = await importServer();
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      getUserByKey: vi.fn(),
      recordSupportOffer: vi.fn()
    };
    server._setDataStoreForTests(mockDataStore);

    const req = buildReq({
      url: "/api/support/offer-complete?username=Player&transaction_id=txn&amount=3"
    });
    const res = buildRes();

    await server.route(req, res);
    expect(res.status).toBe(401);
    expect(mockDataStore.recordSupportOffer).not.toHaveBeenCalled();
  });

  it("skips unapproved offers without touching the datastore", async () => {
    delete process.env.SUPPORT_REWARD_TOKEN;
    const server = await importServer();
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      getUserByKey: vi.fn(),
      recordSupportOffer: vi.fn()
    };
    server._setDataStoreForTests(mockDataStore);

    const req = buildReq({
      url: "/api/support/offer-complete?username=Player&transaction_id=txn&amount=3&status=0"
    });
    const res = buildRes();

    await server.route(req, res);
    const payload = parseBody(res);
    expect(res.status).toBe(200);
    expect(payload.credited).toBe(false);
    expect(payload.skipped).toBe("not_approved");
    expect(mockDataStore.getUserByKey).not.toHaveBeenCalled();
  });

  it("credits supportcoins on approved JSON callbacks", async () => {
    delete process.env.SUPPORT_REWARD_TOKEN;
    const server = await importServer();
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      getUserByKey: vi.fn(async () => ({ key: "player", username: "Player" })),
      recordSupportOffer: vi.fn(async () => ({
        credited: true,
        user: { key: "player", username: "Player", currencies: { supportcoin: 5 } }
      }))
    };
    server._setDataStoreForTests(mockDataStore);

    const req = buildReq({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "Player", transaction_id: "txn", amount: 5, status: "approved" })
    });
    const res = buildRes();

    await server.route(req, res);
    const payload = parseBody(res);
    expect(res.status).toBe(200);
    expect(payload.credited).toBe(true);
    expect(payload.supportcoins).toBe(5);
    expect(mockDataStore.recordSupportOffer).toHaveBeenCalledWith(expect.objectContaining({ amount: 5 }));
  });

  it("accepts urlencoded bodies and header tokens", async () => {
    process.env.SUPPORT_REWARD_TOKEN = "token";
    const server = await importServer();
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      getUserByKey: vi.fn(async () => ({ key: "player", username: "Player" })),
      recordSupportOffer: vi.fn(async () => ({ credited: false, reason: "duplicate" }))
    };
    server._setDataStoreForTests(mockDataStore);

    const req = buildReq({
      method: "POST",
      headers: { "x-support-token": "token" },
      body: "username=Player&transaction_id=txn&amount=2&status=approved"
    });
    const res = buildRes();

    await server.route(req, res);
    const payload = parseBody(res);
    expect(res.status).toBe(200);
    expect(payload.credited).toBe(false);
    expect(payload.reason).toBe("duplicate");
  });

  it("validates required fields before crediting", async () => {
    delete process.env.SUPPORT_REWARD_TOKEN;
    const server = await importServer();
    const mockDataStore = {
      ensureConnected: vi.fn(async () => true),
      getUserByKey: vi.fn(),
      recordSupportOffer: vi.fn()
    };
    server._setDataStoreForTests(mockDataStore);

    const req = buildReq({ url: "/api/support/offer-complete?username=Player&amount=2" });
    const res = buildRes();

    await server.route(req, res);
    const payload = parseBody(res);
    expect(res.status).toBe(400);
    expect(payload.error).toBe("invalid_transaction");
  });
});

describe("support offer helpers", () => {
  it("normalizes payload ids and amount fields", async () => {
    const server = await importServer();
    const normalized = server.__testables.normalizeSupportOfferPayload({
      user: "Player",
      transaction_id: "txn",
      offer_id: "offer",
      reward: "4"
    });
    expect(normalized.username).toBe("Player");
    expect(normalized.transactionId).toBe("txn");
    expect(normalized.offerId).toBe("offer");
    expect(normalized.amount).toBe(4);
  });

  it("treats status values consistently", async () => {
    const server = await importServer();
    expect(server.__testables.isSupportOfferApproved("approved")).toBe(true);
    expect(server.__testables.isSupportOfferApproved("0")).toBe(false);
    expect(server.__testables.isSupportOfferApproved(undefined)).toBe(true);
  });
});
