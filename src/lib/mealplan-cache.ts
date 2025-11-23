export const MP_TTL = Number(process.env.MEALPLAN_CACHE_TTL || 60 * 30); // 30 min

export function mpKey(userId: string, date: string) {
  return `mp:${userId}:${date}`;
}

export function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}
