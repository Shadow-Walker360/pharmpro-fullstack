// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/FullPageSpinner.tsx
// ════════════════════════════════════════════════════════════
export default function FullPageSpinner() {
  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-blue/20 border-t-blue rounded-full animate-spin mx-auto" />
        <p className="text-text3 text-sm mt-4 font-medium">Loading PharmPro…</p>
      </div>
    </div>
  )
}