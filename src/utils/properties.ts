/** Drops empty values (undefined, null, "") so the details card only shows real data. */
export function cleanProperties(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}
