/** 追问输入:Enter 发送 / Shift+Enter 换行,textarea 自增高。 */
import { useRef, useState } from "react";
import { useReaderStore } from "../../store/readerStore";

export function ReaderComposer() {
  const [text, setText] = useState("");
  const sending = useReaderStore((s) => s.sending);
  const sendQuestion = useReaderStore((s) => s.sendQuestion);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const q = text.trim();
    if (!q || sending) return;
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
    void sendQuestion(q);
  };

  return (
    <div className="reader-composer">
      <textarea
        ref={taRef}
        rows={1}
        placeholder="追问这个概念…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const el = e.target;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        className="reader-send"
        onClick={submit}
        disabled={sending || !text.trim()}
        aria-label="发送"
        title="发送"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
