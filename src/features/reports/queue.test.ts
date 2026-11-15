// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { _resetDbForTesting, contentMeta, getDb, initDb } from "@/lib/db";
import { getDeviceId } from "@/lib/device-id";

import { flushPendingReports, submitReport } from "./queue";
import type { ReportDraft } from "./queue";
import { storage } from "./storage";

const BASE_URL = "https://test.example.com";

const mockCapture = jest.fn();
jest.mock("@/lib/analytics", () => ({
  capture: (...args: unknown[]) => mockCapture(...args),
}));

const SONG_ID = "0b6a2f0e-8f3e-4a4e-9d4b-6c1d2f3a4b5c";

const SONG_DRAFT: ReportDraft = {
  target: { type: "song", id: SONG_ID },
  reason: "wrong_chords",
  message: "Во втором куплете Am вместо C",
  screen: "/song/[id]",
  source: "song_footer",
};

function respond(status: number) {
  return new Response(JSON.stringify({}), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sentBodies(): Record<string, unknown>[] {
  return jest
    .mocked(globalThis.fetch)
    .mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
}

beforeEach(async () => {
  storage.clearAll();
  _resetDbForTesting();
  await initDb();
  mockCapture.mockClear();
  process.env.EXPO_PUBLIC_API_URL = BASE_URL;
  jest.spyOn(globalThis, "fetch").mockImplementation(async () => respond(201));
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.restoreAllMocks();
});

test("a submitted report is posted with device and app context", async () => {
  submitReport(SONG_DRAFT, { offline: false });
  await flushPendingReports();

  expect(globalThis.fetch).toHaveBeenCalledWith(
    `${BASE_URL}/api/v1/reports/`,
    expect.objectContaining({ method: "POST" }),
  );
  expect(sentBodies()).toEqual([
    expect.objectContaining({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      target_type: "song",
      target_id: SONG_ID,
      reason: "wrong_chords",
      message: "Во втором куплете Am вместо C",
      device_id: getDeviceId(),
      platform: "ios",
      screen: "/song/[id]",
    }),
  ]);
});

test("an app report carries the contact email and no target id", async () => {
  submitReport(
    {
      target: { type: "app" },
      reason: "bug",
      message: "Не открывается тюнер",
      contactEmail: "user@example.com",
      screen: "/settings",
      source: "settings",
    },
    { offline: false },
  );
  await flushPendingReports();

  expect(sentBodies()[0]).toMatchObject({
    target_type: "app",
    target_id: "",
    contact_email: "user@example.com",
  });
});

test("a report carries the content version the user was looking at", async () => {
  const db = getDb();
  db.insert(contentMeta)
    .values({ id: 1, version: "2026-11-10T12:00:00.123456Z" })
    .run();

  submitReport(SONG_DRAFT, { offline: false });
  await flushPendingReports();

  expect(sentBodies()[0]).toMatchObject({
    content_version: "2026-11-10T12:00:00.123456Z",
  });
});

test("a report that fails to send is retried on the next flush", async () => {
  jest
    .mocked(globalThis.fetch)
    .mockRejectedValueOnce(new TypeError("Network request failed"));

  submitReport(SONG_DRAFT, { offline: true });
  await flushPendingReports();
  await flushPendingReports();

  const [first, second] = sentBodies();
  expect(second).toEqual(first);
});

function droppedEvents() {
  return mockCapture.mock.calls.filter(([event]) => event === "report_dropped");
}

test.each([400, 413, 415, 422])(
  "a report the server rejects with %i is dropped",
  async (status) => {
    jest.mocked(globalThis.fetch).mockResolvedValueOnce(respond(status));

    submitReport(SONG_DRAFT, { offline: false });
    await flushPendingReports();
    await flushPendingReports();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(droppedEvents()).toEqual([
      ["report_dropped", { reason: "rejected", status }],
    ]);
  },
);

test.each([403, 404, 429, 500, 503])(
  "a report answered with %i stays queued and holds back the reports after it",
  async (status) => {
    jest.mocked(globalThis.fetch).mockResolvedValueOnce(respond(status));

    submitReport(SONG_DRAFT, { offline: false });
    submitReport({ ...SONG_DRAFT, message: "второй" }, { offline: false });
    await flushPendingReports();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    await flushPendingReports();
    expect(sentBodies().map((body) => body.message)).toEqual([
      SONG_DRAFT.message,
      SONG_DRAFT.message,
      "второй",
    ]);
    expect(droppedEvents()).toEqual([]);
  },
);

test("a report sent twice is accepted as already delivered", async () => {
  jest.mocked(globalThis.fetch).mockResolvedValueOnce(respond(200));

  submitReport(SONG_DRAFT, { offline: false });
  await flushPendingReports();
  await flushPendingReports();

  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

test("submitting records whether the report had to wait for the network", async () => {
  submitReport(SONG_DRAFT, { offline: true });
  await flushPendingReports();

  expect(mockCapture).toHaveBeenCalledWith("report_submitted", {
    target_type: "song",
    reason: "wrong_chords",
    source: "song_footer",
    queued: true,
  });
});

test("a report still unsent after 30 days is dropped", async () => {
  const now = jest
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse("2026-11-01T10:00:00Z"));
  jest.mocked(globalThis.fetch).mockResolvedValueOnce(respond(503));
  submitReport(SONG_DRAFT, { offline: false });
  await flushPendingReports();

  now.mockReturnValue(Date.parse("2026-12-01T10:00:01Z"));
  await flushPendingReports();

  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(droppedEvents()).toEqual([["report_dropped", { reason: "expired" }]]);
});

test("the 51st waiting report pushes out the oldest", async () => {
  jest.mocked(globalThis.fetch).mockImplementation(async () => respond(503));
  for (let i = 1; i <= 51; i++) {
    submitReport({ ...SONG_DRAFT, message: `#${i}` }, { offline: true });
    await flushPendingReports();
  }
  jest
    .mocked(globalThis.fetch)
    .mockClear()
    .mockImplementation(async () => respond(201));

  await flushPendingReports();

  const messages = sentBodies().map((body) => body.message);
  expect(messages).toHaveLength(50);
  expect(messages[0]).toBe("#2");
  expect(droppedEvents()).toEqual([["report_dropped", { reason: "queue_full" }]]);
});

test("parallel flushes send each report once", async () => {
  submitReport(SONG_DRAFT, { offline: false });

  await Promise.all([flushPendingReports(), flushPendingReports()]);

  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

test("a report submitted while another is being sent goes out in the same pass", async () => {
  let answer: (response: Response) => void = () => {};
  jest
    .mocked(globalThis.fetch)
    .mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));

  submitReport(SONG_DRAFT, { offline: false });
  const running = flushPendingReports();
  submitReport({ ...SONG_DRAFT, message: "второй" }, { offline: false });
  answer(respond(201));
  await running;

  expect(sentBodies().map((body) => body.message)).toEqual([
    SONG_DRAFT.message,
    "второй",
  ]);
});
