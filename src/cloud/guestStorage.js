import {
  STORAGE_KEY,
  EXERCISES,
  initialData,
  parseBackup,
  validateData,
} from "../model.js";
import { mergeChanges } from "./rankingModel.js";
import { guestCharacterName } from "../guestModel.js";

// A date is a daily total, so importing it must not add the same workout twice.
export function mergeGuestData(account, guest) {
  if (!guest) return account;
  const records = { ...account.records };
  for (const [day, record] of Object.entries(guest.records)) {
    const previous = records[day];
    records[day] = previous
      ? {
          ...previous,
          ...Object.fromEntries(
            EXERCISES.map(({ key }) => [
              key,
              Math.max(previous[key], record[key]),
            ]),
          ),
        }
      : record;
  }
  const established =
    !!account.characterName || Object.keys(account.records).length > 0;
  return validateData({
    ...account,
    records,
    characterName:
      account.characterName || guestCharacterName(guest.characterName),
    goals: established ? account.goals : guest.goals,
    goalDefaultsVersion: Math.max(
      account.goalDefaultsVersion,
      guest.goalDefaultsVersion,
    ),
  });
}

export function readGuest(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { data: initialData(), transfers: {} };
  const packet = JSON.parse(raw);
  // Also accept the original local-only backup format.
  if (packet.guestStorageVersion !== 1)
    return { data: parseBackup(raw), transfers: {} };
  const transfers = {};
  for (const [uid, transfer] of Object.entries(packet.transfers || {})) {
    if (!transfer?.id || typeof transfer.id !== "string")
      throw new Error("이어받을 운동 기록을 읽을 수 없습니다.");
    transfers[uid] = {
      id: transfer.id,
      data: parseBackup(JSON.stringify(transfer.data)),
    };
  }
  return {
    data: parseBackup(JSON.stringify(packet.data)),
    transfers,
  };
}

function writeGuest(storage, packet) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ guestStorageVersion: 1, ...packet }),
  );
}

export function storeGuest(storage, data) {
  const packet = readGuest(storage);
  writeGuest(storage, { ...packet, data: validateData(data) });
}

export function claimGuestTransfer(storage, uid, receipt) {
  const packet = readGuest(storage);
  const previous = packet.transfers[uid];
  let changed = false;
  if (previous?.id === receipt) {
    delete packet.transfers[uid];
    changed = true;
  }
  const guest = packet.data;
  const hasData =
    !!guest.characterName ||
    Object.keys(guest.records).length > 0 ||
    JSON.stringify(guest.goals) !== JSON.stringify(initialData().goals);
  if (hasData) {
    packet.transfers[uid] = {
      id: globalThis.crypto.randomUUID(),
      data: packet.transfers[uid]
        ? mergeGuestData(packet.transfers[uid].data, guest)
        : guest,
    };
    packet.data = initialData();
    changed = true;
  }
  // Claim and detach atomically. A failed write leaves the guest records intact.
  // Pending transfers remain bound to this account across logout and reload.
  if (changed) writeGuest(storage, packet);
  return packet.transfers[uid] || null;
}

export function completeGuestTransfer(storage, uid, id) {
  if (!id) return;
  const packet = readGuest(storage);
  if (packet.transfers[uid]?.id !== id) return;
  delete packet.transfers[uid];
  writeGuest(storage, packet);
}

export function prepareAccountScope(local, remote, guestImport) {
  const base = mergeGuestData(remote.data, guestImport?.data);
  let data = local.exists ? mergeChanges(local.base, local.data, base) : base;
  if (guestImport && local.guestImport?.id !== guestImport.id)
    data = mergeGuestData(data, guestImport.data);
  return {
    ...local,
    data,
    base,
    guestImport,
    participating: remote.participating,
    needsPublication: true,
  };
}
