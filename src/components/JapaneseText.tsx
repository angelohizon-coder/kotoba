/** Mark Japanese spans inside mixed English explanations without injecting HTML. */
export default function JapaneseText({ text }: { text: string }) {
  const parts = text.split(/([\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\u3000-\u303f\uff00-\uffef]+)/u);
  return <>{parts.map((part, index) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u.test(part) ? <span lang="ja" key={index}>{part}</span> : part)}</>;
}
