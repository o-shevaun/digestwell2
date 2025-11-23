export function todayYMD(d = new Date()) {
  return d.toISOString().slice(0,10);
}
export function add24hISO(d = new Date()) {
  return new Date(d.getTime() + 24*60*60*1000).toISOString();
}
