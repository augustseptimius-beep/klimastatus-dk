// Passthrough — UI-rammen håndteres nu af app/(app)/k/[kommune]/layout.tsx.
// Disse ruter bruges kun til backward-compat redirects (/dashboard, /indstillinger).
export default function AppRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
