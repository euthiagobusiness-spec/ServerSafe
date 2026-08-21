import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { safeMarkdownUrl } from "./markdown";

test("Markdown ignora HTML bruto e bloqueia protocolos inseguros", () => {
  const html = renderToStaticMarkup(createElement(Markdown, {
    skipHtml: true,
    urlTransform: safeMarkdownUrl,
  }, "<script>alert(1)</script>\n\n**seguro** [perigoso](javascript:alert(1))"));
  assert.doesNotMatch(html, /script|alert\(1\)|javascript:/i);
  assert.match(html, /<strong>seguro<\/strong>/);
  assert.match(html, /href=""/);
});

test("Markdown preserva apenas links web, e-mail, internos e âncoras", () => {
  assert.equal(safeMarkdownUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeMarkdownUrl("mailto:contato@example.com"), "mailto:contato@example.com");
  assert.equal(safeMarkdownUrl("/ajuda"), "/ajuda");
  assert.equal(safeMarkdownUrl("#topo"), "#topo");
  assert.equal(safeMarkdownUrl("data:text/html;base64,AA=="), "");
  assert.equal(safeMarkdownUrl("//evil.example"), "");
});
