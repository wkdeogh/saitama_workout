export async function fetchPublicRanking(period) {
  const response = await fetch(
    `/api/rankings?period=${period === "week" ? "week" : "all"}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok)
    throw new Error(result.error || "랭킹을 불러오지 못했습니다.");
  return result;
}
