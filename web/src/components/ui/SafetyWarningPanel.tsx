// ════════════════════════════════════════════════════════════
// apps/web/src/components/ui/SafetyWarningPanel.tsx
// Renders safety check results from the engine.
// Used on NewPrescriptionPage and PrescriptionDetail.
// ════════════════════════════════════════════════════════════
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'

interface Warning {
  type:             string
  severity:         string
  title:            string
  message:          string
  requiresOverride: boolean
}

interface Props {
  warnings:           Warning[]
  overrides:          Record<string, string>
  onOverride:         (type: string, reason: string) => void
  showOverrideInputs?: boolean
}

const sevConfig: Record<string, { color: string; bg: string; border: string; Icon: any }> = {
  INFO:            { color:'text-blue',   bg:'bg-blue-lt',   border:'border-blue/30',   Icon: Info         },
  WARNING:         { color:'text-amber',  bg:'bg-amber-lt',  border:'border-amber/30',  Icon: AlertTriangle },
  MAJOR:           { color:'text-red',    bg:'bg-red-lt',    border:'border-red/30',    Icon: AlertCircle   },
  CONTRAINDICATED: { color:'text-red',    bg:'bg-red-lt',    border:'border-red/40',    Icon: ShieldAlert   },
}

export function SafetyWarningPanel({
  warnings, overrides, onOverride, showOverrideInputs = true,
}: Props) {
  if (!warnings.length) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-text3 uppercase tracking-wider">
        Safety warnings ({warnings.length})
      </p>
      {warnings.map((w, i) => {
        const cfg = sevConfig[w.severity] ?? sevConfig.INFO
        const { Icon } = cfg
        const overridden = !!overrides[w.type]

        return (
          <div
            key={i}
            className={clsx(
              'rounded-lg border p-3',
              cfg.bg, cfg.border,
              overridden && 'opacity-60',
            )}
          >
            <div className={clsx('flex items-start gap-2', cfg.color)}>
              <Icon size={16} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{w.title}</p>
                <p className="text-xs mt-1 opacity-90">{w.message}</p>

                {/* Override acknowledgment input */}
                {showOverrideInputs && w.requiresOverride && !overridden && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-bold opacity-80">
                      ⚠ Override required — state clinical reason:
                    </p>
                    <div className="flex gap-2">
                      <input
                        id={`override-${i}`}
                        placeholder="Clinical justification..."
                        className={clsx(
                          'flex-1 bg-black/20 border border-current/30 rounded-md',
                          'px-2.5 py-1.5 text-xs placeholder:opacity-50',
                          'outline-none focus:ring-1 focus:ring-current/40',
                          cfg.color,
                        )}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`override-${i}`) as HTMLInputElement
                          if (input?.value.trim()) {
                            onOverride(w.type, input.value.trim())
                          }
                        }}
                        className={clsx(
                          'px-3 py-1.5 rounded-md text-xs font-bold bg-black/20',
                          'hover:bg-black/30 transition-colors border border-current/30',
                          cfg.color,
                        )}
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                )}

                {overridden && (
                  <p className="text-xs mt-2 font-semibold opacity-70">
                    ✓ Overridden: {overrides[w.type]}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}








