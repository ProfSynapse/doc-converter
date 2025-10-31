# Word Document (.docx) Generation

## Overview

This document covers approaches for generating Word documents from markdown, with specific focus on page numbering, formatting, and front matter display.

## Python Solutions

### 1. Pypandoc (Recommended)

**Why Pypandoc?**
- Leverages Pandoc, the universal document converter
- Excellent markdown-to-docx conversion
- Native page numbering support
- Preserves complex formatting
- Handles citations, footnotes, tables, images
- Most straightforward for markdown conversion

**Installation:**
```bash
# Option 1: With bundled Pandoc binary
pip install pypandoc-binary

# Option 2: Separate Pandoc installation
pip install pypandoc
# Then install Pandoc: https://pandoc.org/installing.html
```

**Basic Usage:**

```python
import pypandoc

# Simple conversion
pypandoc.convert_file('input.md', 'docx', outputfile='output.docx')

# From string
markdown_text = "# Hello\n\nThis is **bold**."
pypandoc.convert_text(markdown_text, 'docx', format='md', outputfile='output.docx')
```

**Advanced Usage with Metadata:**

```python
import pypandoc
import frontmatter

# Parse markdown with front matter
post = frontmatter.load('input.md')

# Create document with metadata
document = f"""---
title: {post.get('title', 'Untitled')}
author: {post.get('author', 'Unknown')}
date: {post.get('date', '')}
---

{post.content}
"""

# Convert with options
pypandoc.convert_text(
    document,
    'docx',
    format='md',
    outputfile='output.docx',
    extra_args=[
        '--standalone',                    # Create complete document
        '--highlight-style=pygments',      # Code syntax highlighting
        '--toc',                          # Table of contents
        '--toc-depth=3',                  # TOC depth
        '--number-sections',              # Number headings
    ]
)
```

**Page Numbering with Pypandoc:**

Pypandoc/Pandoc supports page numbering through reference documents (templates):

```python
import pypandoc

# Method 1: Use reference document with page numbers
pypandoc.convert_text(
    markdown_text,
    'docx',
    format='md',
    outputfile='output.docx',
    extra_args=[
        '--reference-doc=template.docx'  # Template with page numbers in footer
    ]
)

# Method 2: Create template programmatically
# Create a Word template with:
# 1. Open Word
# 2. Insert → Page Number → Bottom of Page
# 3. Save as template.docx
# 4. Use as reference document
```

**Custom Styling:**

```python
import pypandoc

# Apply custom CSS styling via HTML intermediate
pypandoc.convert_text(
    markdown_text,
    'docx',
    format='md',
    outputfile='output.docx',
    extra_args=[
        '--reference-doc=custom-template.docx',
        '--highlight-style=tango',
        '-V', 'geometry:margin=1in',
    ]
)
```

**Pros:**
- Most powerful and comprehensive solution
- Excellent markdown rendering (tables, code blocks, images)
- Native page numbering via templates
- Supports complex documents
- Battle-tested by academic and technical writers

**Cons:**
- Requires Pandoc installation or binary bundle
- Less granular control than python-docx
- Template-based customization required for advanced layouts

### 2. python-docx

**Installation:**
```bash
pip install python-docx
```

**When to Use:**
- Need programmatic control over every element
- Building documents from scratch
- Custom layouts not achievable with Pandoc

**Basic Usage:**

```python
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

# Create document
doc = Document()

# Add heading
doc.add_heading('Document Title', 0)

# Add paragraph
p = doc.add_paragraph('This is a paragraph with ')
p.add_run('bold').bold = True
p.add_run(' and ')
p.add_run('italic').italic = True
p.add_run(' text.')

# Add list
doc.add_paragraph('Item 1', style='List Bullet')
doc.add_paragraph('Item 2', style='List Bullet')

# Add image
doc.add_picture('image.png', width=Inches(4))

# Save
doc.save('output.docx')
```

**Page Numbers - The Challenge:**

Python-docx does not have direct API support for page numbers. Three workarounds exist:

**Method 1: Template-Based (Recommended for python-docx)**

```python
from docx import Document

# Create or use template with page numbers already configured
doc = Document('template_with_page_numbers.docx')

# Add content
doc.add_heading('Title', 0)
doc.add_paragraph('Content here...')

doc.save('output.docx')
```

**Method 2: XML Manipulation (Complex)**

```python
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def add_page_number(section):
    """Add page number to footer using XML manipulation"""
    footer = section.footer
    paragraph = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Create page number field
    run = paragraph.add_run()
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')

    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = "PAGE"

    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'end')

    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)

# Usage
doc = Document()
doc.add_paragraph('Content here')
add_page_number(doc.sections[0])
doc.save('output.docx')
```

**Method 3: External Library (Spire.Doc)**

```python
# Commercial library with free tier
from spire.doc import Document
from spire.doc.common import PageNumberStyle

doc = Document()
section = doc.AddSection()

# Add page numbers
footer = section.HeadersFooters.Footer
paragraph = footer.AddParagraph()
paragraph.Format.HorizontalAlignment = HorizontalAlignment.Center

# Insert page number field
paragraph.AppendField("page number", FieldType.FieldPage)
paragraph.AppendText(" of ")
paragraph.AppendField("total pages", FieldType.FieldNumPages)

doc.SaveToFile("output.docx", FileFormat.Docx)
```

**Pros:**
- Fine-grained control over document structure
- No external dependencies
- Pure Python implementation
- Good for programmatic document generation

**Cons:**
- No native page numbering support
- Requires XML manipulation or templates
- More verbose for markdown conversion
- Need to manually handle markdown rendering

### 3. docxtpl (Template-Based)

**Installation:**
```bash
pip install docxtpl
```

**Features:**
- Uses Word documents as Jinja2 templates
- Preserves Word formatting and page numbers
- Excellent for form-filling and reports

**Usage:**

```python
from docxtpl import DocxTemplate

# Load template (created in Word with {{variables}})
doc = DocxTemplate("template.docx")

# Context data
context = {
    'title': 'My Document',
    'author': 'John Doe',
    'content': 'This is the content',
    'items': ['Item 1', 'Item 2', 'Item 3']
}

# Render
doc.render(context)
doc.save("output.docx")
```

**Template Example (template.docx):**
```
Title: {{title}}
Author: {{author}}

{{content}}

{% for item in items %}
- {{item}}
{% endfor %}
```

**Page Numbers:**
Page numbers are added in the Word template (Insert → Page Number) and preserved automatically.

**Pros:**
- Simple page number handling (use Word's built-in feature)
- Non-technical users can edit templates
- Preserves complex Word formatting
- Great for repetitive document generation

**Cons:**
- Requires pre-created Word template
- Less suitable for dynamic markdown conversion
- Template maintenance overhead

## Node.js Solutions

### 1. docx (Recommended for Node.js)

**Installation:**
```bash
npm install docx
```

**GitHub:** https://github.com/dolanmiu/docx
**Downloads:** Used by 300+ packages
**Status:** Actively maintained

**Basic Usage:**

```javascript
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');

// Create document
const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "My Document",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                children: [
                    new TextRun("This is "),
                    new TextRun({ text: "bold", bold: true }),
                    new TextRun(" and "),
                    new TextRun({ text: "italic", italics: true }),
                    new TextRun(" text."),
                ],
            }),
        ],
    }],
});

// Save
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("output.docx", buffer);
});
```

**Page Numbers:**

```javascript
const { Document, Packer, Paragraph, TextRun, Footer, PageNumber } = require('docx');

const doc = new Document({
    sections: [{
        properties: {},
        footers: {
            default: new Footer({
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun("Page "),
                            new TextRun({
                                children: [PageNumber.CURRENT],
                            }),
                            new TextRun(" of "),
                            new TextRun({
                                children: [PageNumber.TOTAL_PAGES],
                            }),
                        ],
                    }),
                ],
            }),
        },
        children: [
            new Paragraph({ text: "Content..." }),
        ],
    }],
});
```

**With Markdown Parser:**

```javascript
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const marked = require('marked');
const matter = require('gray-matter');

// Parse markdown
const file = matter(fileContent);
const tokens = marked.lexer(file.content);

// Convert tokens to docx elements
const docElements = tokens.map(token => {
    switch(token.type) {
        case 'heading':
            return new Paragraph({
                text: token.text,
                heading: HeadingLevel[`HEADING_${token.depth}`],
            });
        case 'paragraph':
            return new Paragraph({ text: token.text });
        // ... handle other token types
    }
});

const doc = new Document({
    sections: [{ children: docElements }]
});
```

**Pros:**
- Native page number support
- Declarative API
- Browser and Node.js support
- TypeScript support
- Good documentation

**Cons:**
- Verbose for complex documents
- Manual markdown-to-docx conversion required
- More code than Pandoc approach

### 2. officegen

**Installation:**
```bash
npm install officegen
```

**Basic Usage:**

```javascript
const officegen = require('officegen');
const fs = require('fs');

// Create docx object
const docx = officegen('docx');

// Add paragraph
const p = docx.createP();
p.addText('Hello ');
p.addText('World', { bold: true });

// Add table
const table = [
    [{ val: "Header 1" }, { val: "Header 2" }],
    [{ val: "Row 1 Col 1" }, { val: "Row 1 Col 2" }]
];
docx.createTable(table);

// Save
const out = fs.createWriteStream('output.docx');
docx.generate(out);
```

**Pros:**
- Simple API
- Supports PowerPoint and Excel too
- Stream-based generation

**Cons:**
- Less active maintenance
- Limited page numbering support
- Fewer features than docx package

## Comparison Matrix

| Feature | Pypandoc | python-docx | docxtpl | docx (Node) | officegen |
|---------|----------|-------------|---------|-------------|-----------|
| **Language** | Python | Python | Python | Node.js | Node.js |
| **Markdown Native** | ✓✓ | ✗ | ✗ | ✗ | ✗ |
| **Page Numbers** | ✓ (template) | ✗ (XML hack) | ✓ (template) | ✓ | Limited |
| **Complexity** | Low | High | Medium | Medium | Medium |
| **Control** | Medium | High | Low | High | Medium |
| **Learning Curve** | Easy | Moderate | Easy | Moderate | Moderate |
| **Maintenance** | Excellent | Excellent | Good | Excellent | Fair |

## Recommendation

### For This Project: Pypandoc

**Rationale:**
1. **Native Markdown Support:** Designed specifically for markdown conversion
2. **Page Numbering:** Straightforward via reference documents
3. **Quality Output:** Professional formatting out of the box
4. **Minimal Code:** Fewer lines than manual parsing + docx building
5. **Comprehensive Features:** Tables, code blocks, images, citations work perfectly
6. **Proven:** Used by academics, technical writers, documentation systems

**Implementation Strategy:**

```python
import frontmatter
import pypandoc
from pathlib import Path

def convert_markdown_to_docx(input_path, output_path, template_path=None):
    """
    Convert markdown with front matter to Word document

    Args:
        input_path: Path to markdown file
        output_path: Path for output docx
        template_path: Optional path to Word template with page numbers
    """
    # Parse front matter
    post = frontmatter.load(input_path)

    # Build document with metadata at top
    document = f"""---
title: {post.get('title', 'Untitled')}
author: {post.get('author', 'Unknown')}
date: {post.get('date', '')}
---

# {post.get('title', 'Untitled')}

**Author:** {post.get('author', 'Unknown')}
**Date:** {post.get('date', '')}

---

{post.content}
"""

    # Prepare extra args
    extra_args = [
        '--standalone',
        '--highlight-style=pygments',
    ]

    if template_path:
        extra_args.append(f'--reference-doc={template_path}')

    # Convert
    pypandoc.convert_text(
        document,
        'docx',
        format='md',
        outputfile=output_path,
        extra_args=extra_args
    )
```

---

**Sources:**
- Pandoc User's Guide: https://pandoc.org/MANUAL.html
- python-docx documentation: https://python-docx.readthedocs.io/
- Stack Overflow discussions on page numbering
- GitHub repositories and issue trackers
