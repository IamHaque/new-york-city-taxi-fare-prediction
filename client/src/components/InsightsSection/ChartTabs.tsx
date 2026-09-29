import { cn } from '@/lib/utils';

export type ChartGroup = 'demand' | 'fares' | 'locations' | 'model';

interface ChartTabsProps {
  activeGroup: ChartGroup;
  onChange: (group: ChartGroup) => void;
}

const GROUPS: { id: ChartGroup; label: string }[] = [
  { id: 'demand', label: 'Demand' },
  { id: 'fares', label: 'Fares' },
  { id: 'locations', label: 'Locations' },
  { id: 'model', label: 'Model & Data' },
];

/**
 * Tab button group for the insights dashboard (PRD v4, Story 7.1) — hand-rolled on purpose:
 * no Radix Tabs dependency, reusing the visual style InputModeToggle established before this
 * PRD deleted it (bordered pills, active = primary tint, mono labels).
 */
export function ChartTabs({ activeGroup, onChange }: ChartTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Chart categories">
      {GROUPS.map((group) => {
        const isActive = activeGroup === group.id;
        return (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`insights-panel-${group.id}`}
            id={`insights-tab-${group.id}`}
            className={cn(
              'rounded-md border px-3 py-1.5 font-mono text-xs font-medium transition-colors',
              isActive
                ? 'bg-primary/15 border-primary text-primary'
                : 'border-border bg-transparent text-muted-foreground hover:border-primary'
            )}
            onClick={() => onChange(group.id)}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}
