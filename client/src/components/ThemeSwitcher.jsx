import { useState } from 'react'
import { Sun, Moon, Palette, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/useThemeStore'

const DIRECTIONS = [
  {
    id: 'ledger',
    name: 'Ledger',
    tag: 'institutional · emerald',
    swatch: 'bg-[oklch(0.72_0.14_165)]',
  },
  {
    id: 'clearwater',
    name: 'Clearwater',
    tag: 'warm · light-first',
    swatch: 'bg-[oklch(0.5_0.11_190)]',
  },
  {
    id: 'forge',
    name: 'Forge',
    tag: 'bold · violet glass',
    swatch: 'bg-[oklch(0.65_0.2_285)]',
  },
]

/**
 * Floating design-preview picker (dev aid + shipping feature).
 * Lets you flip between the three UI directions and light/dark mode live.
 */
export default function ThemeSwitcher() {
  const { direction, setDirection, mode, setMode } = useThemeStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-2xl border border-border bg-popover p-3 shadow-pop animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="size-3.5 text-primary" /> Design direction
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close theme picker"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDirection(d.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer',
                  direction === d.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <span
                  className={cn(
                    'size-3.5 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-popover',
                    d.swatch,
                    direction === d.id ? 'ring-ring' : 'ring-border'
                  )}
                />
                <span className="flex-1">
                  <span className="block text-xs font-semibold">{d.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{d.tag}</span>
                </span>
                {direction === d.id && (
                  <span className="text-[9px] font-mono uppercase text-primary">active</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border px-1 pt-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Appearance</span>
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
              {[
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'dark', icon: Moon, label: 'Dark' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer',
                    mode === m.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <m.icon className="size-3" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-pop transition-all cursor-pointer',
          open
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-popover text-foreground border-border hover:border-primary/50'
        )}
        aria-label="Open design direction picker"
      >
        <Palette className="size-4" />
        {DIRECTIONS.find((d) => d.id === direction)?.name}
      </button>
    </div>
  )
}
