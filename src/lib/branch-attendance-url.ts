/** Build the QR / link URL for branch mobile attendance (HashRouter). */
export function buildBranchAttendanceQrUrl(payload: object): string {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  if (typeof window !== 'undefined') {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/branch-attendance?d=${encoded}`;
  }
  return `#/branch-attendance?d=${encoded}`;
}
