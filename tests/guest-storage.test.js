import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  initialData,
  emptyCounts,
  saveRecord,
  stats,
} from "../src/model.js";
import { mergeChanges } from "../src/cloud/rankingModel.js";
import { guestCharacterName } from "../src/guestModel.js";
import {
  mergeGuestData,
  readGuest,
  storeGuest,
  claimGuestTransfer,
  completeGuestTransfer,
  prepareAccountScope,
} from "../src/cloud/guestStorage.js";

const day = "2026-09-27";
const add = (data, date, counts) =>
  saveRecord(data, date, { ...emptyCounts(), ...counts }, day);
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
const scope = (data = initialData(), base = initialData(), exists = false) => ({
  uid: "owner",
  data,
  base,
  exists,
  participating: false,
});

test("guest saves and reloads without an account, including original local backups", () => {
  const disk = storage();
  const data = add(initialData(), day, { pushups: 50, runningKm: 1.2 });
  disk.setItem(STORAGE_KEY, JSON.stringify(data));
  assert.deepEqual(readGuest(disk).data, data);
  storeGuest(disk, add(data, day, { squats: 25 }));
  assert.equal(readGuest(disk).data.records[day].pushups, 0);
  assert.equal(readGuest(disk).data.records[day].squats, 25);
});

test("new account inherits guest history, name, goals and recalculated growth", () => {
  const guest = {
    ...add(initialData(), day, { pushups: 150 }),
    characterName: "훈련생",
    goals: { pushups: 50, squats: 50, situps: 0, runningKm: 0 },
  };
  const merged = mergeGuestData(initialData(), guest);
  assert.deepEqual(merged, guest);
  assert.equal(stats(merged, day).level, 2);
  assert.equal(stats(merged, day).total, 150);
  assert.equal(
    mergeGuestData(initialData(), { ...guest, characterName: "" })
      .characterName,
    "빡빡이",
  );
});

test("existing account keeps name, goals and other dates; overlap uses per-exercise max", () => {
  let remote = add(initialData(), "2026-09-26", { pushups: 100 });
  remote = {
    ...add(remote, day, { pushups: 80, runningKm: 1.5 }),
    characterName: "회원",
  };
  const guest = {
    ...add(initialData(), day, { pushups: 50, squats: 30, runningKm: 2.1 }),
    characterName: "기기",
    goals: { pushups: 50, squats: 50, situps: 0, runningKm: 0 },
  };
  const merged = mergeGuestData(remote, guest);
  assert.deepEqual(merged.records["2026-09-26"], remote.records["2026-09-26"]);
  assert.deepEqual(merged.records[day], {
    pushups: 80,
    squats: 30,
    situps: 0,
    runningKm: 2.1,
    goals: remote.records[day].goals,
  });
  assert.equal(merged.characterName, "회원");
  assert.deepEqual(merged.goals, remote.goals);
  assert.deepEqual(mergeGuestData(merged, guest), merged);
});

test("transfer is detached atomically and bound to the first account until success", () => {
  const disk = storage();
  const guest = add(initialData(), day, { pushups: 50 });
  storeGuest(disk, guest);
  const transfer = claimGuestTransfer(disk, "owner");
  assert.deepEqual(transfer.data, guest);
  assert.deepEqual(readGuest(disk).data, initialData());
  assert.equal(claimGuestTransfer(disk, "different-account"), null);
  assert.deepEqual(claimGuestTransfer(disk, "owner"), transfer);
  completeGuestTransfer(disk, "owner", "wrong-id");
  assert.deepEqual(claimGuestTransfer(disk, "owner"), transfer);
  completeGuestTransfer(disk, "owner", transfer.id);
  assert.equal(claimGuestTransfer(disk, "owner"), null);
});

test("failure while claiming leaves guest records intact; corrupt storage is never overwritten", () => {
  const disk = storage();
  const guest = add(initialData(), day, { pushups: 50 });
  storeGuest(disk, guest);
  const blocked = {
    ...disk,
    setItem: () => {
      throw new Error("quota");
    },
  };
  assert.throws(() => claimGuestTransfer(blocked, "owner"), /quota/);
  assert.deepEqual(readGuest(disk).data, guest);
  disk.setItem(STORAGE_KEY, "broken backup");
  assert.throws(() => storeGuest(disk, initialData()));
  assert.equal(disk.getItem(STORAGE_KEY), "broken backup");
});

test("receipt prevents reimport after interrupted cleanup, while new guest records still transfer", () => {
  const disk = storage();
  storeGuest(disk, add(initialData(), day, { pushups: 50 }));
  const old = claimGuestTransfer(disk, "owner");
  storeGuest(disk, add(initialData(), "2026-09-26", { squats: 30 }));
  const next = claimGuestTransfer(disk, "owner", old.id);
  assert.notEqual(next.id, old.id);
  assert.equal(next.data.records[day], undefined);
  assert.equal(next.data.records["2026-09-26"].squats, 30);
  completeGuestTransfer(disk, "owner", old.id);
  assert.deepEqual(claimGuestTransfer(disk, "owner"), next);
});

test("pending transfer survives reload and offline edits or deletion are not resurrected", () => {
  const transfer = {
    id: "pending",
    data: add(initialData(), day, { pushups: 100 }),
  };
  const remote = { data: initialData(), participating: false };
  const staged = prepareAccountScope(scope(), remote, transfer);
  assert.equal(staged.data.records[day].pushups, 100);
  const edited = {
    ...staged,
    exists: true,
    data: add(staged.data, day, { pushups: 25 }),
  };
  const reloaded = prepareAccountScope(edited, remote, transfer);
  assert.equal(reloaded.data.records[day].pushups, 25);
  const sent = mergeChanges(
    reloaded.base,
    reloaded.data,
    mergeGuestData(remote.data, transfer.data),
  );
  assert.equal(sent.records[day].pushups, 25);
  const deleted = { ...edited, data: { ...edited.data, records: {} } };
  assert.deepEqual(
    prepareAccountScope(deleted, remote, transfer).data.records,
    {},
  );
});

test("concurrent remote changes during import are retained without double counting", () => {
  const transfer = {
    id: "pending",
    data: add(initialData(), day, { pushups: 100 }),
  };
  const remote = { data: initialData(), participating: false };
  const staged = prepareAccountScope(scope(), remote, transfer);
  const concurrent = add(initialData(), day, { pushups: 150, squats: 50 });
  const sent = mergeChanges(
    staged.base,
    staged.data,
    mergeGuestData(concurrent, transfer.data),
  );
  assert.equal(sent.records[day].pushups, 150);
  assert.equal(sent.records[day].squats, 50);
  assert.deepEqual(mergeGuestData(sent, transfer.data), sent);
});

test("empty guest browsing creates no transfer and keeps a fresh account unnamed", () => {
  const disk = storage();
  assert.equal(claimGuestTransfer(disk, "owner"), null);
  assert.equal(
    prepareAccountScope(
      scope(),
      { data: initialData(), participating: false },
      null,
    ).data.characterName,
    "",
  );
});

test("guest default and legacy default display as 빡빡이 while personal names survive", () => {
  assert.equal(guestCharacterName(""), "빡빡이");
  assert.equal(guestCharacterName("나의 사이타마"), "빡빡이");
  assert.equal(guestCharacterName("내 훈련생"), "내 훈련생");
  assert.equal(guestCharacterName("비회원"), "비회원");
  const guest = { ...initialData(), characterName: "나의 사이타마" };
  assert.equal(mergeGuestData(initialData(), guest).characterName, "빡빡이");
  const member = { ...initialData(), characterName: "나의 사이타마" };
  assert.equal(mergeGuestData(member, guest).characterName, "나의 사이타마");
});
