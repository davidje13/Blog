---
title: 'Markdown Tests'
hidden: true
author: David Evans
description: 'A test page for checking markdown behaviour and styling'
created: 2026-09-01
---

# Markdown Tests

An abbreviation: WYSIWYG

A table

| foo  | bar  | baz   |
| ---- | ---- | ----- |
| one  | two  | three |
| four | five | six   |

Wide tables

| a very long title that makes the cell quite large | bar                    | another long title which pushes things wide | woo     |
| ------------------------------------------------- | ---------------------- | ------------------------------------------- | ------- |
| value 1                                           | long value 2 goes here | value 3                                     | value 4 |

| foo                                                      | bar                                           | baz     |
| -------------------------------------------------------- | --------------------------------------------- | ------- |
| `unwrappable long value that forces the cell very large` | `another long value which pushes things wide` | value 3 |

Footnotes with: number[^note] more[^another-note], asterisk[^*] more[^**]
more[^***], dagger[^dagger] more[^dagger2], and section[^section].

1st, 2nd, 3rd, 4th, 5th, ..., 10th, 11th, 15th, 20th, 21st, 25th, 30th, 100th,
101st, etc.

<!-- prettier-ignore-start -->
<!-- waiting on release of https://github.com/prettier/prettier/pull/19739 -->
Text with ^^superscript^^ ~subscript~ ~~strikeout~~. ^^superscript^^~~strikeout~~. \^\^not superscript\^\^ \~not subscript\~ \~\~not strikeout\~\~. ~sub~~strike~~ ~ ^^sup~~strike~~^^. ^^superscript \^^ still superscript\\^^. ~subscript \~ still subscript\\~.

Chemical formulae: H~2~O, CO~2~, C~6~H~5~---COOH.

Generic~subscript~; both^^super^^~and sub~; both~sub~^^and super^^. ^^16^^O^^2+^^~2~

<!-- prettier-ignore-end -->

> Blockquote
>
> > Nested

Inline mathematics $e^{i\pi}+1=0$.

$$
e=mc^2
$$

Aligned equations:

$$
\begin{align*}
a^2+b & = 3c^2
\\
c & = \sqrt{\frac{a^2+b}{3}}
\end{align*}
$$

$$
|x| = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases}
$$

$$
\boxed{2a+b} + \sout{x - y} + \cancel{3-3}
$$

Smart "double quotes" and 'single quotes', foo's apostrophes, and -- en-dash and
--- em-dash...

Smart quotes "**with styling**" or **"with styling"** and '_single quotes_' or
_'single quotes'_ and abbreviation WYSIWYG's.

![A QR link](qr:http://example.com) caption for the QR link

![Random QR text](qr:hello)

```js
import { foo } from 'node:blah';

function bar(arg1, arg2) {
  console.log(arg1.property, arg2.method(), foo);
}
```

```sh
#!/bin/sh
set -e
FOO=bar
echo hello > /dev/null
echo "foo is $FOO or ${FOO:-fallback}"

# random-command does something
random-command blah
A=b C=d E="f g h" I="j" K=l\ m random-command arg
echo hi | A=B random-command

cat <<EOF
document $FOO
EOF

cat <<"EOF"
document $FOO
EOF

cat <<"EOF" >foo.txt
document $FOO
EOF

cat <<"EOF" | sudo tee file.txt
document $FOO
EOF
```

Link in code style: [`random-command`].

```sequence-diagram
Foo is red
Foo -> +Bar: Hello
-Bar --> Foo: Hi
```

```json plot
{
  "title": "Multiple mathematical plots",
  "type": "layout",
  "direction": "horizontal",
  "parts": [
    {
      "title": "Enclosed regions",
      "type": "cartesian",
      "axes": [
        { "label": "x", "range": [0, 10], "grid": [10, 1] },
        { "label": "y", "range": [0, 10], "grid": [10, 1] }
      ],
      "elements": [
        { "type": "equation", "equation": "(x)^2+(y)^2<=1" },
        { "type": "equation", "equation": "(x-5)^2+(y)^2<=1" },
        { "type": "equation", "equation": "(x-10)^2+(y)^2<=1" },
        { "type": "equation", "equation": "(x)^2+(y-5)^2<=1" },
        { "type": "equation", "equation": "(x-5)^2+(y-5)^2<=1" },
        { "type": "equation", "equation": "(x-10)^2+(y-5)^2<=1" },
        { "type": "equation", "equation": "(x)^2+(y-10)^2<=1" },
        { "type": "equation", "equation": "(x-5)^2+(y-10)^2<=1" },
        { "type": "equation", "equation": "(x-10)^2+(y-10)^2<=1" },
        {
          "type": "measurement",
          "text": "w",
          "position": {
            "p1": [4, 4.2],
            "p2": [6, 4.2],
            "direction": "x",
            "position": "below"
          }
        },
        {
          "type": "measurement",
          "text": "w",
          "position": {
            "p1": [4, 5.8],
            "p2": [6, 5.8],
            "direction": "x",
            "position": "above"
          }
        },
        {
          "type": "measurement",
          "text": "h",
          "position": {
            "p1": [4.2, 4],
            "p2": [4.2, 6],
            "direction": "y",
            "position": "left"
          }
        },
        {
          "type": "measurement",
          "text": "h",
          "position": {
            "p1": [5.8, 4],
            "p2": [5.8, 6],
            "direction": "y",
            "position": "right"
          }
        }
      ]
    },
    {
      "title": "Excluded regions",
      "type": "cartesian",
      "axes": [
        { "label": "x", "range": [0, 10], "grid": [10, 1] },
        { "label": "y", "range": [0, 10], "grid": [10, 1] }
      ],
      "elements": [
        {
          "type": "label",
          "text": "Comments",
          "position": { "coord": [9, 8], "anchor": [1, 0] }
        },
        {
          "type": "equation",
          "equation": "min((x)^2+(y)^2,(x-5)^2+(y)^2,(x-10)^2+(y)^2,(x)^2+(y-5)^2,(x-5)^2+(y-5)^2,(x-10)^2+(y-5)^2,(x)^2+(y-10)^2,(x-5)^2+(y-10)^2,(x-10)^2+(y-10)^2)>1",
          "description": "the plane with circles of radius 1 removed at (0 0), (0 5), (0 10), (5 0), (5 5), (5 10), (10 0), (10 5), and (10 10)"
        }
      ]
    }
  ]
}
```

```json plot
{
  "title": "Overlapping fills",
  "type": "cartesian",
  "axes": [
    { "label": "x", "range": [-2, 2] },
    { "label": "y", "range": [-2, 2] }
  ],
  "elements": [
    { "type": "equation", "equation": "(x)^2+(y)^2<=1", "label": "one" },
    { "type": "equation", "equation": "(x-0.5)^2+(y)^2<=1", "label": "two" },
    { "type": "equation", "equation": "(x+0.5)^2+(y)^2<=1", "label": "three" },
    { "type": "equation", "equation": "(x)^2+(y-0.5)^2<=1", "label": "four" },
    {
      "type": "equation",
      "equation": "(x-0.5)^2+(y-0.5)^2<=1",
      "label": "five"
    },
    {
      "type": "equation",
      "equation": "(x+0.5)^2+(y-0.5)^2<=1",
      "label": "six"
    },
    { "type": "equation", "equation": "(x)^2+(y+0.5)^2<=1", "label": "seven" },
    {
      "type": "equation",
      "equation": "(x-0.5)^2+(y+0.5)^2<=1",
      "label": "eight"
    },
    {
      "type": "equation",
      "equation": "(x+0.5)^2+(y+0.5)^2<=1",
      "label": "nine"
    }
  ]
}
```

Some more complicated graphs:

```json plot
{
  "type": "layout",
  "direction": "vertical",
  "parts": [
    {
      "type": "layout",
      "direction": "horizontal",
      "parts": [
        {
          "title": "Areas going off-screen",
          "type": "cartesian",
          "axes": [
            { "label": "things", "range": [-3, 17], "grid": [10, 1] },
            { "label": "others", "range": [-16, 4], "grid": [10, 1] }
          ],
          "elements": [
            { "type": "equation", "equation": "sin(sqrt(x^2+y^2)*4)>0" }
          ]
        },
        {
          "title": "Saddle points",
          "type": "cartesian",
          "axes": [{ "range": [0, 100] }, { "range": [0, 100] }],
          "elements": [
            { "type": "equation", "equation": "sin(x+y)+cos(x-y)=0.001" }
          ]
        }
      ]
    },
    {
      "title": "Rectangular",
      "type": "cartesian",
      "axes": [
        { "label": "time", "range": [0, 10], "grid": [2, 1] },
        { "label": "boing", "range": [0, 2], "grid": [1, 0.2] }
      ],
      "elements": [
        {
          "type": "equation",
          "equation": "y>=abs(sin(x*pi*0.5))",
          "resolution": [300, 10]
        }
      ]
    }
  ]
}
```

*[WYSIWYG]: What You See Is What You Get

[`random-command`]: #about-random-command

[^note]: Numbered footnote content

[^another-note]: Another numbered footnote content

[^*]: Asterisk footnote content

[^**]: 2-Asterisk footnote content

[^***]: 3-Asterisk footnote content

[^dagger]: Dagger footnote content

[^dagger2]: Double-dagger footnote content

[^section]: Section footnote content
