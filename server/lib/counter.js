export function printedPagesSince(previousCount, currentCount) {
  if (previousCount == null || currentCount < previousCount) return null;
  return currentCount - previousCount;
}
