import { describe, expect, it } from "vitest";
import { htmlToText } from "../../src/ingest/html-to-text.js";

describe("htmlToText", () => {
  it("extracts the title and visible text, dropping scripts and styles", () => {
    const html = `
      <html>
        <head><title>About</title><style>.x { color: red; }</style></head>
        <body>
          <script>console.log("noise")</script>
          <h1>Hello</h1>
          <p>World</p>
        </body>
      </html>
    `;

    const { title, text } = htmlToText(html);

    expect(title).toBe("About");
    expect(text).toBe("Hello\nWorld");
  });
});
