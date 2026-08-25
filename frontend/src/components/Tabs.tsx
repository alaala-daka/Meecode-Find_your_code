// src/components/Tabs.tsx —— 规范 §6.7 下划线式
import './Tabs.css'

interface Props {
  items: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}

export default function Tabs({ items, active, onChange }: Props) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={item.key === active}
          className={`tab ${item.key === active ? 'is-active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
