/** 精读正文:markdown 渲染(display 衬线长文排印,全站唯一)。 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReaderEntry } from "../../store/readerStore";

export function ReaderArticle({ entry }: { entry: ReaderEntry }) {
  return (
    <article className="reader-article" key={entry.nodeId}>
      <div className="reader-divider" aria-hidden="true">
        <svg width="72" height="14" viewBox="0 0 72 14" fill="none" stroke="var(--bush-deep)" strokeWidth="1.2" strokeLinecap="round">
          <path d="M2 7h26M44 7h26" opacity="0.5" />
          <path d="M36 12V6M36 6c-3 0-5-2-5-4 2.2 0 5 1.5 5 4zm0 0c3 0 5-2 5-4-2.2 0-5 1.5-5 4z" />
        </svg>
      </div>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.detail}</ReactMarkdown>
      <p className="reader-article-hint">读完有疑问?在下面追问,我可以联网查资料。</p>
    </article>
  );
}
