// src/components/FileTree.tsx —— 规范 §7.3：240px 树，当前文件浅蓝底
import { useState } from 'react'
import type { RepoTreeItem } from '../api/types'
import './FileTree.css'

interface Props {
  tree: RepoTreeItem[]
  current: string | null
  onSelect: (path: string) => void
}

function Node({ item, depth, current, onSelect }: { item: RepoTreeItem; depth: number } & Omit<Props, 'tree'>) {
  const [open, setOpen] = useState(true)
  if (item.type === 'dir') {
    return (
      <li>
        <button className="tree-row tree-dir" style={{ paddingLeft: 12 + depth * 14 }}
          onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? '▾' : '▸'} {item.name}
        </button>
        {open && item.children && (
          <ul>
            {item.children.map((child) => (
              <Node key={child.path} item={child} depth={depth + 1} current={current} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </li>
    )
  }
  return (
    <li>
      <button className={`tree-row ${current === item.path ? 'is-current' : ''}`}
        aria-current={current === item.path ? 'true' : undefined}
        style={{ paddingLeft: 12 + depth * 14 }} onClick={() => onSelect(item.path)}>
        {item.name}
      </button>
    </li>
  )
}

export default function FileTree({ tree, current, onSelect }: Props) {
  return (
    <nav className="file-tree" aria-label="文件树">
      <ul>
        {tree.map((item) => (
          <Node key={item.path} item={item} depth={0} current={current} onSelect={onSelect} />
        ))}
      </ul>
    </nav>
  )
}
