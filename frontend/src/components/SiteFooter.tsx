// src/components/SiteFooter.tsx —— 全站页脚：收住版面，强化「发现好代码」的定位
import { Link } from 'react-router-dom'
import './SiteFooter.css'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-brand">
          觅码
          <span className="footer-sub">meecode</span>
        </p>
        <p className="footer-tag">发现潜力开源仓库，让好代码被看见。</p>
        <Link className="footer-cta" to="/submit">推广我的仓库 →</Link>
      </div>
    </footer>
  )
}
