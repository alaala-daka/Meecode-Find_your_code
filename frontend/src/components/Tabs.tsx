// src/components/Tabs.tsx —— 规范 §6.7 下划线式；ARIA tabs 键交互（←/→）
import './Tabs.css'

interface Props {
  items: { key: string; label: string; count?: number }[]
  active: string
  onChange: (key: string) => void
  panelId?: string
}

export default function Tabs({ items, active, onChange, panelId }: Props) {
  return (
    <div
      className="tabs"
      role="tablist"
      onKeyDown={(e) => {
        const idx = items.findIndex((i) => i.key === active)
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange((items[idx + 1] ?? items[0]).key) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); onChange((items[idx - 1] ?? items[items.length - 1]).key) }
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={item.key === active}
          aria-controls={panelId}
          className={`tab ${item.key === active ? 'is-active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          {typeof item.count === 'number' && <span className="tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}
