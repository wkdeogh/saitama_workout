export async function sendSocialPush(db, messaging, to, data) {
  if (!messaging) return { sent: 0, failed: 0 };
  const devices = await db
    .collection("pushDevices")
    .where("uid", "==", to)
    .limit(10)
    .get();
  if (devices.empty) return { sent: 0, failed: 0 };
  try {
    const result = await messaging.sendEachForMulticast({
      tokens: devices.docs.map((d) => d.data().token),
      data: { uid: to, ...data },
      webpush: { headers: { TTL: "86400", Urgency: "normal" } },
    });
    await Promise.all(
      result.responses.map((r, i) =>
        !r.success &&
        [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token",
        ].includes(r.error?.code)
          ? devices.docs[i].ref.delete()
          : Promise.resolve(),
      ),
    );
    return { sent: result.successCount, failed: result.failureCount };
  } catch {
    return { sent: 0, failed: devices.size };
  }
}
