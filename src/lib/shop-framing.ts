/** Keep the storefront and forecourt inside the horizontal camera view. */
export function shopFraming(width: number, height: number) {
  const mobile = width < 768;
  const aspect = Math.max(0.1, width / Math.max(1, height));
  const distance = Math.max(12, 9 / (2 * Math.tan(Math.PI / 9) * aspect));
  return { mobile, distance, fogScale: mobile ? Math.max(1, distance / 12) : 1 };
}