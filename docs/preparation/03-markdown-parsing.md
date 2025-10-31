# Markdown and YAML Front Matter Parsing

## Overview

This document covers libraries and approaches for parsing markdown files with YAML front matter, extracting metadata, and converting markdown content to structured formats.

## YAML Front Matter Parsing

### Python: python-frontmatter

**Installation:**
```bash
pip install python-frontmatter
```

**GitHub:** https://github.com/eyeseast/python-frontmatter
**PyPI:** https://pypi.org/project/python-frontmatter/
**Downloads:** ~300,000+/week
**Status:** Actively maintained, well-documented

**Features:**
- Parses YAML, JSON, or TOML front matter
- Simple, intuitive API
- Returns both metadata and content
- Supports custom handlers
- File or string input

**Code Example:**

```python
import frontmatter

# Parse from file
post = frontmatter.load('document.md')

# Access front matter
print(post['title'])        # Access by key
print(post.metadata)        # All metadata as dict

# Access content
print(post.content)         # Markdown content without front matter

# Parse from string
text = """---
title: My Document
author: John Doe
date: 2025-10-31
tags: [python, markdown]
---

# Content Here
This is the markdown content.
"""

post = frontmatter.loads(text)
print(post['title'])        # "My Document"
print(post['author'])       # "John Doe"
print(post.content)         # "# Content Here\nThis is..."
```

**Advanced Usage:**

```python
import frontmatter
from datetime import datetime

# Custom handler for specific front matter types
def custom_handler(post):
    # Process metadata after parsing
    if 'date' in post:
        post['date'] = datetime.fromisoformat(post['date'])
    return post

# Dump back to string
post = frontmatter.Post("Content here")
post['title'] = "New Title"
post['date'] = "2025-10-31"
output = frontmatter.dumps(post)

# Write to file
with open('output.md', 'w') as f:
    frontmatter.dump(post, f)
```

**Why Choose python-frontmatter:**
- Clean, Pythonic API
- Handles edge cases well (no front matter, multiple separators)
- Preserves original content structure
- Widely used in static site generators (Pelican, Lektor)

### Node.js: gray-matter

**Installation:**
```bash
npm install gray-matter
```

**GitHub:** https://github.com/jonschlinkert/gray-matter
**NPM:** https://www.npmjs.com/package/gray-matter
**Downloads:** ~2,000,000+/week
**Dependents:** 2031 packages
**Status:** Battle-tested, used by Gatsby, Astro, VitePress, TinaCMS

**Features:**
- Parses YAML, JSON, TOML, or Coffee Front Matter
- Custom delimiters support
- Excerpt support
- Multiple engine support
- Very fast and reliable

**Code Example:**

```javascript
const matter = require('gray-matter');
const fs = require('fs');

// Parse from file
const file = fs.readFileSync('document.md', 'utf8');
const parsed = matter(file);

console.log(parsed.data);      // Front matter as object
console.log(parsed.content);   // Markdown content
console.log(parsed.orig);      // Original string

// Parse from string
const text = `---
title: My Document
author: John Doe
---
# Content Here`;

const result = matter(text);
console.log(result.data.title);    // "My Document"
console.log(result.content);       // "# Content Here"
```

**Advanced Usage:**

```javascript
const matter = require('gray-matter');

// Custom delimiters
const result = matter(text, {
  delimiters: ['~~~', '~~~']
});

// Custom engines
const result = matter(text, {
  engines: {
    yaml: (str) => { /* custom parser */ }
  }
});

// Stringify back
const newContent = matter.stringify(content, { title: 'New Title' });

// With excerpt
const file = matter(text, { excerpt: true });
console.log(file.excerpt);  // First paragraph as excerpt
```

**Why Choose gray-matter:**
- Massive adoption in Node.js ecosystem
- Extremely well-tested (battle-tested)
- Used by major frameworks
- Excellent performance
- Comprehensive documentation

## Markdown Parsing Libraries

### Python Options

#### 1. Python-Markdown

**Installation:**
```bash
pip install markdown
```

**Features:**
- Pure Python implementation
- Extensive extension system
- CommonMark support via extension
- Syntax highlighting support
- Table, footnotes, and more

**Code Example:**

```python
import markdown

md = markdown.Markdown(extensions=[
    'extra',           # Tables, fenced code, etc.
    'codehilite',      # Syntax highlighting
    'toc',             # Table of contents
    'nl2br',           # Newline to <br>
    'sane_lists'       # Better list handling
])

html = md.convert("# Hello\n\nThis is **bold**.")
print(html)

# With front matter processing
import frontmatter
post = frontmatter.load('document.md')
html_content = md.convert(post.content)
```

#### 2. Mistune

**Installation:**
```bash
pip install mistune
```

**Features:**
- Fastest pure-Python markdown parser
- CommonMark compliant
- Extensible with plugins
- Zero dependencies
- Good security track record

**Code Example:**

```python
import mistune

# Basic usage
html = mistune.html("# Hello World")

# With plugins
markdown = mistune.create_markdown(plugins=['table', 'strikethrough', 'footnotes'])
html = markdown(text)

# Custom renderer
class MyRenderer(mistune.HTMLRenderer):
    def heading(self, text, level):
        return f'<h{level} class="custom">{text}</h{level}>\n'

renderer = MyRenderer()
md = mistune.create_markdown(renderer=renderer)
html = md(text)
```

#### 3. Pypandoc (Recommended)

**Installation:**
```bash
pip install pypandoc-binary  # Includes Pandoc binary
# OR
pip install pypandoc  # Requires separate Pandoc installation
```

**Features:**
- Wrapper for Pandoc
- Supports 100+ formats
- Excellent markdown extensions
- Citations, math, tables, footnotes
- Can output directly to docx, pdf, html

**Code Example:**

```python
import pypandoc

# Markdown to HTML
html = pypandoc.convert_text(markdown_string, 'html', format='md')

# Markdown to DOCX (preserves structure)
pypandoc.convert_text(
    markdown_string,
    'docx',
    format='md',
    outputfile='output.docx',
    extra_args=[
        '--standalone',
        '--highlight-style=pygments'
    ]
)

# From file
pypandoc.convert_file('input.md', 'docx', outputfile='output.docx')

# With metadata
full_text = f"""---
title: {post['title']}
author: {post['author']}
---

{post.content}
"""
pypandoc.convert_text(full_text, 'docx', format='md', outputfile='output.docx')
```

### Node.js Options

#### 1. marked

**Installation:**
```bash
npm install marked
```

**Downloads:** 17,171,235/week
**Performance:** 1,587 ops/sec (fastest)
**GitHub Stars:** 31,997+

**Features:**
- Extremely fast
- Lightweight
- Compiler + parser approach
- Built-in sanitizer
- Extensions support

**Code Example:**

```javascript
const marked = require('marked');

// Basic usage
const html = marked.parse('# Hello World');

// With options
marked.setOptions({
  highlight: function(code, lang) {
    // Syntax highlighting
  },
  breaks: true,
  gfm: true  // GitHub Flavored Markdown
});

// Async parsing
const html = await marked.parse(markdownString);
```

#### 2. markdown-it

**Installation:**
```bash
npm install markdown-it
```

**Downloads:** 10,374,779/week
**Performance:** 1,568 ops/sec (CommonMark mode)
**GitHub Stars:** 20,457
**CommonMark:** 100% compliant

**Features:**
- Highly extensible plugin system
- CommonMark + GFM support
- Syntax extensions
- Source map support
- Security-focused

**Code Example:**

```javascript
const MarkdownIt = require('markdown-it');

// Basic usage
const md = new MarkdownIt();
const html = md.render('# Hello World');

// With plugins
const md = new MarkdownIt()
  .use(require('markdown-it-footnote'))
  .use(require('markdown-it-abbr'))
  .use(require('markdown-it-emoji'));

const html = md.render(markdownString);

// Custom rendering
const md = new MarkdownIt({
  html: true,        // Enable HTML tags
  linkify: true,     // Auto-convert URLs
  typographer: true  // Smart quotes, dashes
});
```

## Comparison Matrix

| Feature | python-frontmatter | gray-matter | Python-Markdown | Mistune | marked | markdown-it |
|---------|-------------------|-------------|-----------------|---------|--------|-------------|
| **Language** | Python | Node.js | Python | Python | Node.js | Node.js |
| **Front Matter** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **CommonMark** | N/A | N/A | Extension | ✓ | ✓ | ✓ |
| **Performance** | Fast | Very Fast | Moderate | Very Fast | Fastest | Fast |
| **Extensions** | YAML/JSON/TOML | YAML/JSON/TOML | ✓ | ✓ | ✓ | ✓✓ |
| **Downloads** | 300K+ | 2M+ | 1M+ | 500K+ | 17M+ | 10M+ |
| **Maturity** | Mature | Mature | Very Mature | Mature | Very Mature | Mature |

## Recommended Approach for This Project

### Python Stack (Recommended)

```python
import frontmatter
import pypandoc

# 1. Parse front matter
post = frontmatter.load('input.md')

# 2. Format front matter for display
front_matter_display = f"""
# {post.get('title', 'Untitled')}

**Author:** {post.get('author', 'Unknown')}
**Date:** {post.get('date', '')}

---

"""

# 3. Combine front matter display with content
full_content = front_matter_display + post.content

# 4. Convert to desired format using pypandoc
pypandoc.convert_text(
    full_content,
    'docx',
    format='md',
    outputfile='output.docx',
    extra_args=['--highlight-style=pygments']
)
```

### Node.js Alternative

```javascript
const matter = require('gray-matter');
const marked = require('marked');
const { Document, Packer, Paragraph } = require('docx');

// 1. Parse front matter
const file = matter(fileContent);

// 2. Create front matter display
const frontMatterText = `
# ${file.data.title || 'Untitled'}

**Author:** ${file.data.author || 'Unknown'}
**Date:** ${file.data.date || ''}

---
`;

// 3. Convert markdown to HTML
const html = marked.parse(frontMatterText + file.content);

// 4. Further processing for Word/PDF...
```

## Best Practices

1. **Validation:** Always validate front matter schema before processing
2. **Error Handling:** Handle missing or malformed front matter gracefully
3. **Encoding:** Use UTF-8 encoding consistently
4. **Security:** Sanitize user-provided markdown to prevent XSS
5. **Performance:** Cache parsed results for repeated processing

---

**Sources:**
- GitHub repositories and documentation
- npm/PyPI download statistics (2025)
- Performance benchmarks from respective projects
- Community adoption metrics
