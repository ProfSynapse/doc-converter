# PDF Generation with Page Numbers

## Overview

This document covers PDF generation approaches from markdown, with emphasis on page numbering, formatting control, and CSS styling capabilities.

## Python Solutions

### 1. WeasyPrint (Recommended for Control)

**Why WeasyPrint?**
- Excellent CSS support for page numbering
- HTML/CSS-based styling (familiar to web developers)
- High-quality PDF output
- Native page number support via CSS
- Good typography and layout engine
- Actively maintained

**Installation:**
```bash
pip install weasyprint
```

**Dependencies:**
WeasyPrint requires system libraries for rendering:
- **Linux:** `apt-get install libpango-1.0-0 libpangoft2-1.0-0`
- **macOS:** `brew install pango`
- **Docker:** Include in Dockerfile (see Docker section)

**Basic Usage:**

```python
from weasyprint import HTML, CSS

# From HTML string
html_content = "<h1>Hello World</h1><p>Content here</p>"
HTML(string=html_content).write_pdf('output.pdf')

# From file
HTML('document.html').write_pdf('output.pdf')

# With custom CSS
HTML('document.html').write_pdf(
    'output.pdf',
    stylesheets=[CSS(filename='style.css')]
)
```

**Page Numbers with CSS:**

```python
from weasyprint import HTML, CSS

html_content = """
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: A4;
            margin: 1in;

            /* Page numbers at bottom center */
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
            }
        }

        /* Alternative positions */
        @page {
            @bottom-right {
                content: counter(page);
            }

            @top-right {
                content: "Document Title";
            }
        }

        /* First page without page number */
        @page :first {
            @bottom-center {
                content: "";
            }
        }
    </style>
</head>
<body>
    <h1>Document Title</h1>
    <p>Content goes here...</p>
</body>
</html>
"""

HTML(string=html_content).write_pdf('output.pdf')
```

**Complete Markdown to PDF Pipeline:**

```python
import frontmatter
import markdown
from weasyprint import HTML, CSS

def markdown_to_pdf(input_path, output_path):
    """Convert markdown with front matter to styled PDF"""

    # Parse front matter and content
    post = frontmatter.load(input_path)

    # Convert markdown to HTML
    md = markdown.Markdown(extensions=[
        'extra',       # Tables, fenced code
        'codehilite',  # Syntax highlighting
        'toc',         # Table of contents
    ])
    html_body = md.convert(post.content)

    # Build complete HTML document
    html_document = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{post.get('title', 'Document')}</title>
        <style>
            @page {{
                size: A4;
                margin: 1in 0.75in;

                @bottom-center {{
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10pt;
                    color: #666;
                }}

                @top-right {{
                    content: "{post.get('title', '')}";
                    font-size: 9pt;
                    color: #999;
                }}
            }}

            @page :first {{
                @bottom-center {{
                    content: "";
                }}
                @top-right {{
                    content: "";
                }}
            }}

            body {{
                font-family: 'Georgia', serif;
                font-size: 11pt;
                line-height: 1.6;
                color: #333;
            }}

            h1, h2, h3 {{
                font-family: 'Helvetica', sans-serif;
                color: #000;
            }}

            h1 {{
                font-size: 24pt;
                margin-top: 0;
                border-bottom: 2px solid #333;
                padding-bottom: 10pt;
            }}

            h2 {{
                font-size: 18pt;
                margin-top: 20pt;
                border-bottom: 1px solid #999;
            }}

            code {{
                background-color: #f4f4f4;
                padding: 2px 4px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 9pt;
            }}

            pre {{
                background-color: #f4f4f4;
                padding: 10pt;
                border-left: 3px solid #666;
                overflow-x: auto;
                page-break-inside: avoid;
            }}

            pre code {{
                background-color: transparent;
                padding: 0;
            }}

            blockquote {{
                border-left: 4px solid #ddd;
                padding-left: 15pt;
                margin-left: 0;
                color: #666;
                font-style: italic;
            }}

            table {{
                border-collapse: collapse;
                width: 100%;
                margin: 15pt 0;
            }}

            th, td {{
                border: 1px solid #ddd;
                padding: 8pt;
                text-align: left;
            }}

            th {{
                background-color: #f4f4f4;
                font-weight: bold;
            }}

            img {{
                max-width: 100%;
                height: auto;
            }}

            a {{
                color: #0066cc;
                text-decoration: none;
            }}

            .front-matter {{
                border: 1px solid #ddd;
                background-color: #f9f9f9;
                padding: 15pt;
                margin-bottom: 20pt;
            }}

            .front-matter h2 {{
                margin-top: 0;
                font-size: 14pt;
            }}
        </style>
    </head>
    <body>
        <div class="front-matter">
            <h2>Document Information</h2>
            <p><strong>Title:</strong> {post.get('title', 'Untitled')}</p>
            <p><strong>Author:</strong> {post.get('author', 'Unknown')}</p>
            <p><strong>Date:</strong> {post.get('date', '')}</p>
        </div>

        {html_body}
    </body>
    </html>
    """

    # Generate PDF
    HTML(string=html_document).write_pdf(output_path)

# Usage
markdown_to_pdf('input.md', 'output.pdf')
```

**Advanced CSS Features:**

```css
/* Different margins for left/right pages */
@page :left {
    margin-left: 1.5in;
    margin-right: 1in;
}

@page :right {
    margin-left: 1in;
    margin-right: 1.5in;
}

/* Page breaks */
h1 {
    page-break-before: always;
}

.no-break {
    page-break-inside: avoid;
}

/* Running headers with content from document */
h1 {
    string-set: chapter content();
}

@page {
    @top-center {
        content: string(chapter);
    }
}

/* Footnotes */
.footnote {
    float: footnote;
}

@page {
    @footnote {
        border-top: 1px solid black;
        padding-top: 6pt;
    }
}
```

**Pros:**
- Best CSS support for page layout
- Professional typography
- Native page numbering
- Great for complex layouts
- HTML/CSS familiarity

**Cons:**
- Requires system dependencies
- Larger Docker images
- Slower than some alternatives
- CSS learning curve for advanced features

### 2. Pypandoc with PDF (LaTeX Backend)

**Installation:**
```bash
pip install pypandoc-binary
# Requires LaTeX installation for PDF (or use weasyprint engine)
```

**Usage:**

```python
import pypandoc
import frontmatter

post = frontmatter.load('input.md')

# Prepare document
document = f"""---
title: {post.get('title')}
author: {post.get('author')}
date: {post.get('date')}
---

{post.content}
"""

# Convert to PDF via LaTeX (default)
pypandoc.convert_text(
    document,
    'pdf',
    format='md',
    outputfile='output.pdf',
    extra_args=[
        '--pdf-engine=xelatex',
        '-V', 'geometry:margin=1in',
        '--highlight-style=pygments',
        '--toc',
    ]
)

# Or use WeasyPrint engine
pypandoc.convert_text(
    document,
    'pdf',
    format='md',
    outputfile='output.pdf',
    extra_args=[
        '--pdf-engine=weasyprint',
    ]
)
```

**Page Numbering:**
Automatic with LaTeX backend. Customize via YAML metadata:

```yaml
---
title: My Document
author: John Doe
header-includes: |
  \usepackage{fancyhdr}
  \pagestyle{fancy}
  \fancyfoot[C]{Page \thepage\ of \pageref{LastPage}}
---
```

**Pros:**
- Excellent markdown rendering
- Professional academic output
- Automatic page numbering
- Great for technical documents

**Cons:**
- Requires LaTeX installation (large)
- Complex customization
- Slower compilation

### 3. ReportLab (Programmatic)

**Installation:**
```bash
pip install reportlab
```

**When to Use:**
- Need pixel-perfect control
- Generating reports programmatically
- Complex custom layouts

**Page Numbers Example:**

```python
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak
from reportlab.lib.units import inch

def add_page_number(canvas, doc):
    """Add page number to each page"""
    page_num = canvas.getPageNumber()
    text = f"Page {page_num}"
    canvas.drawCentredString(4.25*inch, 0.5*inch, text)

# Create PDF
doc = SimpleDocTemplate("output.pdf", pagesize=letter)
styles = getSampleStyleSheet()

# Build content
story = []
story.append(Paragraph("Title", styles['Heading1']))
story.append(Paragraph("Content here...", styles['BodyText']))

# Build with page numbers
doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
```

**Complete Markdown Conversion:**

```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import markdown
import frontmatter

def markdown_to_reportlab_pdf(input_path, output_path):
    # Parse
    post = frontmatter.load(input_path)
    html_content = markdown.markdown(post.content)

    # Create PDF
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Front matter
    story.append(Paragraph(f"<b>Title:</b> {post.get('title')}", styles['Normal']))
    story.append(Paragraph(f"<b>Author:</b> {post.get('author')}", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))

    # Convert HTML to ReportLab (requires html2pdf or manual parsing)
    # This is complex and why WeasyPrint is preferred

    # Build with page numbers
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
```

**Pros:**
- Ultimate control
- Fast generation
- No external dependencies
- Suitable for forms/reports

**Cons:**
- Very verbose
- Manual HTML/markdown parsing
- Steep learning curve
- Not ideal for markdown conversion

## Node.js Solutions

### 1. Puppeteer (Browser-Based)

**Installation:**
```bash
npm install puppeteer
```

**Usage:**

```javascript
const puppeteer = require('puppeteer');
const marked = require('marked');
const matter = require('gray-matter');
const fs = require('fs');

async function markdownToPDF(inputPath, outputPath) {
    // Parse markdown
    const fileContent = fs.readFileSync(inputPath, 'utf8');
    const parsed = matter(fileContent);
    const html = marked.parse(parsed.content);

    // Build complete HTML
    const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @page {
                margin: 1in;

                @bottom-center {
                    content: counter(page) " of " counter(pages);
                }
            }

            body {
                font-family: Georgia, serif;
                font-size: 11pt;
                line-height: 1.6;
            }

            h1 { font-size: 24pt; }
            h2 { font-size: 18pt; }

            pre {
                background: #f4f4f4;
                padding: 10px;
                border-left: 3px solid #666;
            }
        </style>
    </head>
    <body>
        <div>
            <h2>Document Information</h2>
            <p><strong>Title:</strong> ${parsed.data.title}</p>
            <p><strong>Author:</strong> ${parsed.data.author}</p>
        </div>
        ${html}
    </body>
    </html>
    `;

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(fullHTML);
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
            <div style="font-size: 10px; text-align: center; width: 100%;">
                <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
        `,
        margin: {
            top: '1in',
            right: '0.75in',
            bottom: '1in',
            left: '0.75in'
        }
    });

    await browser.close();
}
```

**Pros:**
- Perfect browser rendering
- Modern CSS support
- Good page number support
- Great for web-based content

**Cons:**
- Heavy (includes Chromium)
- Slow startup
- High memory usage
- Not serverless-friendly

### 2. PDFKit

**Installation:**
```bash
npm install pdfkit
```

**Usage:**

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('output.pdf'));

// Add content
doc.fontSize(24).text('Title', { align: 'center' });
doc.fontSize(11).text('Content here...');

// Page numbers (on each page)
doc.on('pageAdded', () => {
    const pageNumber = doc.bufferedPageRange().count;
    doc.fontSize(10).text(
        `Page ${pageNumber}`,
        0,
        doc.page.height - 50,
        { align: 'center' }
    );
});

doc.end();
```

**Pros:**
- Lightweight
- Fast
- Works in browser and Node

**Cons:**
- Very low-level
- Manual layout
- Complex markdown rendering

## Comparison Matrix

| Feature | WeasyPrint | Pypandoc (PDF) | ReportLab | Puppeteer | PDFKit |
|---------|------------|----------------|-----------|-----------|--------|
| **Language** | Python | Python | Python | Node.js | Node.js |
| **Page Numbers** | ✓✓ (CSS) | ✓✓ (auto) | ✓ (manual) | ✓ | ✓ (manual) |
| **CSS Styling** | ✓✓ | Limited | ✗ | ✓✓ | ✗ |
| **Markdown Native** | Via HTML | ✓✓ | ✗ | Via HTML | ✗ |
| **Quality** | Excellent | Excellent | Good | Excellent | Good |
| **Speed** | Moderate | Slow (LaTeX) | Fast | Slow | Fast |
| **Dependencies** | System libs | LaTeX/WP | None | Chromium | None |
| **Docker Size** | Large | Large | Small | Very Large | Small |
| **Learning Curve** | Easy (CSS) | Easy | Steep | Moderate | Steep |

## Recommendation

### For This Project: WeasyPrint

**Rationale:**
1. **Best Page Number Support:** Native CSS `@page` rules
2. **CSS Familiarity:** Web developers know CSS
3. **Quality Output:** Professional typography
4. **Flexibility:** Easy to customize styles
5. **Markdown-Friendly:** Works well with HTML from markdown

**Alternative: Pypandoc**
If you prefer a single tool for both Word and PDF, use pypandoc with the WeasyPrint engine:

```python
pypandoc.convert_text(
    document,
    'pdf',
    format='md',
    outputfile='output.pdf',
    extra_args=['--pdf-engine=weasyprint']
)
```

This gives you the best of both worlds: Pandoc's markdown processing + WeasyPrint's PDF quality.

---

**Sources:**
- WeasyPrint documentation: https://doc.courtbouillon.org/weasyprint/
- Puppeteer API: https://pptr.dev/
- ReportLab User Guide: https://www.reportlab.com/docs/reportlab-userguide.pdf
- CSS Paged Media specification
