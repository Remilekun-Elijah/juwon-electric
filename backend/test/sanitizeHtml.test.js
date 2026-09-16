import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeHtml } from "../shared/sanitizeHtml.js";

const cases = [
  ["keeps allowed formatting", "<p>Hello <strong>world</strong></p>", "<p>Hello <strong>world</strong></p>"],
  ["drops script with content", "<p>a</p><script>alert(1)</script><p>b</p>", "<p>a</p><p>b</p>"],
  ["drops style and iframe", "<style>p{}</style><iframe src=x></iframe>ok", "ok"],
  ["drops event handlers", '<p onclick="alert(1)" class="x">t</p>', "<p>t</p>"],
  ["drops unknown tags, keeps text", "<div><font>text</font></div>", "text"],
  ["javascript href removed", '<a href="javascript:alert(1)">x</a>', '<a rel="noopener noreferrer nofollow">x</a>'],
  ["entity-encoded javascript href removed", '<a href="jav&#x61;script:alert(1)">x</a>', '<a rel="noopener noreferrer nofollow">x</a>'],
  ["whitespace-split javascript href removed", '<a href="java\tscript:alert(1)">x</a>', '<a rel="noopener noreferrer nofollow">x</a>'],
  ["data href removed", '<a href="data:text/html,<b>x</b>">x</a>', '<a rel="noopener noreferrer nofollow">x</a>'],
  [
    "https href kept, rel forced, target only _blank",
    '<a href="https://example.com/a?b=1&amp;c=2" target="_top" rel="opener">x</a>',
    '<a href="https://example.com/a?b=1&amp;c=2" rel="noopener noreferrer nofollow">x</a>',
  ],
  ["protocol-relative href removed", '<a href="//evil.com">x</a>', '<a rel="noopener noreferrer nofollow">x</a>'],
  ["comments removed", "a<!-- <script>x</script> -->b", "ab"],
  ["stray angle brackets escaped", "1 < 2 > 0", "1 &lt; 2 &gt; 0"],
  ["encoded tags stay text", "&lt;script&gt;alert(1)&lt;/script&gt;", "&lt;script&gt;alert(1)&lt;/script&gt;"],
  ["unclosed tags closed", "<ul><li>one<li>two", "<ul><li>one<li>two</li></li></ul>"],
  ["unmatched close ignored", "</p>text</strong>", "text"],
  ["img removed", '<img src=x onerror="alert(1)">caption', "caption"],
  ["svg content removed", "<svg><script>alert(1)</script></svg>after", "after"],
  ["unterminated script drops the rest", "safe<script>alert(1)", "safe"],
  ["uppercase tags normalized", "<P>Hi<BR></P>", "<p>Hi<br></p>"],
  ["table cell spans are numbers only", '<table><tr><td colspan="2" rowspan="x">c</td></tr></table>', '<table><tr><td colspan="2">c</td></tr></table>'],
];

for (const [name, input, expected] of cases) {
  test(`sanitizeHtml: ${name}`, () => {
    assert.equal(sanitizeHtml(input), expected);
  });
}

test("sanitizeHtml is idempotent", () => {
  for (const [, input] of cases) {
    const once = sanitizeHtml(input);
    assert.equal(sanitizeHtml(once), once);
  }
});

test("sanitizeHtml never emits a raw script tag or event handler", () => {
  const nasty = [
    "<scr<script>ipt>alert(1)</script>",
    "<<script>script>alert(1)<</script>/script>",
    '<a href="x" onmouseover=alert(1)>x</a>',
    '<p title="x" onclick=alert(1)>t</p>',
    "<a href='https://ok.example' title='\" onclick=alert(1) x=\"'>t</a>",
  ];
  for (const input of nasty) {
    const output = sanitizeHtml(input);
    assert.doesNotMatch(output, /<script/i, input);
    // Event handlers must not appear as attributes (quoted values are escaped text).
    assert.doesNotMatch(output.replace(/"[^"]*"/g, '""'), /<[^>]+\son\w+=/i, input);
  }
});
