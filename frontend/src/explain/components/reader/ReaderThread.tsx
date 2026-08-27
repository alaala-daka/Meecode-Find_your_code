/** 追问会话流:芽标 = Agent,陶土圆点 = 用户;搜索状态行。 */
import type { ReaderEntry } from "../../store/readerStore";
import { useReaderStore } from "../../store/readerStore";

export function SproutMark({ swaying }: { swaying?: boolean }) {
  return (
    <span className={`reader-sprout ${swaying ? "swaying" : ""}`} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 21v-8" />
        <path d="M12 13c-4 0-7-2.6-7-6 4.3 0 7 2.4 7 6z" />
        <path d="M12 13c4 0 7-2.6 7-6-4.3 0-7 2.4-7 6z" />
      </svg>
    </span>
  );
}

export function ReaderThread({ entry }: { entry: ReaderEntry }) {
  const sending = useReaderStore((s) => s.sending);
  const searchQuery = useReaderStore((s) => s.searchQuery);
  if (entry.messages.length === 0 && !sending) return null;

  const waitingFirstDelta =
    sending && (entry.messages.length === 0 || entry.messages[entry.messages.length - 1].role === "user");

  return (
    <section className="reader-thread" aria-label="追问记录">
      <p className="reader-thread-label">── 追问 ──</p>
      {entry.messages.map((m, i) =>
        m.role === "user" ? (
          <div key={i} className="reader-msg user">
            <span className="reader-seed-dot" aria-hidden="true" />
            <p>{m.content}</p>
          </div>
        ) : (
          <div key={i} className="reader-msg agent">
            <SproutMark />
            <p>{m.content}</p>
          </div>
        ),
      )}
      {searchQuery && (
        <div className="reader-msg agent status">
          <SproutMark swaying />
          <p className="reader-status">正在联网搜索:{searchQuery}</p>
        </div>
      )}
      {!searchQuery && waitingFirstDelta && (
        <div className="reader-msg agent status">
          <SproutMark swaying />
          <p className="reader-status">正在思考…</p>
        </div>
      )}
    </section>
  );
}
