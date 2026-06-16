export function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return {
    bg: `hsla(${h}, 85%, 50%, 0.12)`,
    text: `hsl(${h}, 85%, 35%)`,
    dot: `hsl(${h}, 85%, 50%)`
  };
}
