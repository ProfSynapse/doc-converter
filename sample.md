---
title: Sample Markdown Document
author: PACT Backend Coder
date: 2025-10-31
version: 1.0
tags: [markdown, converter, sample]
---

# Introduction

This is a sample markdown document to demonstrate the capabilities of the **Markdown to Word/PDF Converter**. It includes various markdown features to showcase the conversion quality.

## Text Formatting

You can format text in multiple ways:
- **Bold text** using double asterisks
- *Italic text* using single asterisks
- ***Bold and italic*** using triple asterisks
- `Inline code` using backticks
- ~~Strikethrough~~ using double tildes

## Lists

### Unordered Lists
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

### Ordered Lists
1. First item
2. Second item
3. Third item
   1. Nested 3.1
   2. Nested 3.2

## Code Blocks

### Python Example

```python
def markdown_converter(input_file, output_format):
    """
    Convert markdown to specified format
    """
    with open(input_file, 'r') as f:
        content = f.read()

    if output_format == 'pdf':
        return convert_to_pdf(content)
    elif output_format == 'docx':
        return convert_to_docx(content)
```

### JavaScript Example

```javascript
async function convertMarkdown(file, format) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}
```

## Tables

| Feature | Word | PDF |
|---------|:----:|:---:|
| Front Matter Display | ✓ | ✓ |
| Page Numbers | ✓ | ✓ |
| Syntax Highlighting | ✓ | ✓ |
| Tables | ✓ | ✓ |
| Links | ✓ | ✓ |

## Blockquotes

> "The best way to predict the future is to invent it."
>
> — Alan Kay

> **Note:** This converter supports nested blockquotes and rich formatting within quotes.

## Links

- [OpenAI](https://openai.com)
- [GitHub](https://github.com)
- [Markdown Guide](https://www.markdownguide.org)

## Horizontal Rules

You can create horizontal rules using three or more hyphens:

---

## Special Characters

The converter handles special characters correctly:
- Copyright: ©
- Trademark: ™
- Registered: ®
- Arrows: → ← ↑ ↓
- Math: ≥ ≤ ≠ ±

## Conclusion

This sample document demonstrates the conversion capabilities. Upload your own markdown files to see how they're converted to professional Word and PDF documents with:

1. Preserved formatting
2. Automatic page numbers
3. Front matter display
4. Syntax highlighting
5. Professional styling

---

**Created by:** Markdown to Word/PDF Converter v1.0.0
**Technology:** Python, Flask, Pandoc, WeasyPrint
