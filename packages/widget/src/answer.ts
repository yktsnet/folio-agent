// handler が返す回答の形式（プレーンテキスト、記法はリンクの [表示する文字](http(s)://…) だけ）を描く。
// HTML は解釈せず、テキストノードと <a> を組み立てる。形式を守らせるのは handler の normalize_answer で、
// ここでは古い handler が URL をそのまま返した場合にだけ、その URL をリンクにする。
const TOKEN = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>"'（）「」『』【】、。]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

function link(url: string, label: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = label;
  // サイト内（Contact など）は訪問者がいまいるタブで開き、外部だけ新しいタブにする
  if (!isSameOrigin(url)) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}

export function renderAnswer(text: string): Node[] {
  const nodes: Node[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index;
    let end = start + match[0].length;
    let node: Node;
    if (match[1] !== undefined && match[2] !== undefined) {
      node = link(match[2], match[1]);
    } else {
      const url = match[0].replace(TRAILING_PUNCTUATION, "");
      end = start + url.length;
      node = link(url, url);
    }
    if (start > last) nodes.push(document.createTextNode(text.slice(last, start)));
    nodes.push(node);
    last = end;
  }
  if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
  return nodes;
}
