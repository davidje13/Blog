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

Text with ^^superscript^^.

> Blockquote
>
> > Nested

Inline mathematics $e^{i\pi}+1=0$.

$$
e=mc^2
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

```sequence-diagram
Foo is red
Foo -> +Bar: Hello
-Bar --> Foo: Hi
```

*[WYSIWYG]: What You See Is What You Get

[^note]: Numbered footnote content

[^another-note]: Another numbered footnote content

[^*]: Asterisk footnote content

[^**]: 2-Asterisk footnote content

[^***]: 3-Asterisk footnote content

[^dagger]: Dagger footnote content

[^dagger2]: Double-dagger footnote content

[^section]: Section footnote content
