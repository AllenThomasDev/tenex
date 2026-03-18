export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
