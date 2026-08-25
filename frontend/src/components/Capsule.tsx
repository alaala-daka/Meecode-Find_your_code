// src/components/Capsule.tsx —— 规范 §6.5：行内 style 承载语言派生色
import './Capsule.css'

interface Props {
  label: string
  bg: string
  fg: string
}

export default function Capsule({ label, bg, fg }: Props) {
  return (
    <span className="capsule" style={{ backgroundColor: bg, color: fg }}>
      {label}
    </span>
  )
}
