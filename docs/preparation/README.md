# Markdown to Word/PDF Converter - Preparation Documentation

## Overview

This directory contains comprehensive research and documentation for building a markdown to Word/PDF converter application with YAML front matter support, page numbering, and Railway deployment via Docker.

## Quick Start

**TL;DR Recommendation:**

**Technology Stack:** Python 3.12+ with Pypandoc and WeasyPrint
- **Front Matter Parsing:** `python-frontmatter`
- **Word Generation:** `pypandoc` (wrapper for Pandoc)
- **PDF Generation:** `weasyprint` (CSS-based styling with page numbers)
- **Web Framework:** Flask + Gunicorn
- **Containerization:** Docker with python:3.12-slim
- **Deployment:** Railway platform

**Why This Stack?**
- Most mature document processing ecosystem
- Native page numbering support
- Straightforward implementation
- Production-ready libraries
- ~350MB container size
- Excellent markdown rendering quality

## Documentation Index

### Core Documents

1. **[Executive Summary](01-executive-summary.md)**
   - Quick overview of findings
   - Recommended tech stack
   - Critical challenges identified
   - Next steps

2. **[Language Comparison](02-language-comparison.md)**
   - Python vs Node.js vs Go
   - Detailed ecosystem comparison
   - Performance and size metrics
   - Final recommendation rationale

3. **[Markdown Parsing](03-markdown-parsing.md)**
   - YAML front matter parsing (python-frontmatter, gray-matter)
   - Markdown rendering libraries
   - Code examples and usage patterns

4. **[Word Document Generation](04-word-generation.md)**
   - Pypandoc approach (recommended)
   - python-docx alternatives
   - Page numbering implementation strategies
   - Template-based approaches

5. **[PDF Generation](05-pdf-generation.md)**
   - WeasyPrint with CSS styling (recommended)
   - Page number implementation with CSS @page rules
   - Alternative approaches (ReportLab, Puppeteer)
   - Complete styling examples

6. **[Docker Deployment](06-docker-deployment.md)**
   - Multi-stage build configuration
   - Image size optimization
   - Security best practices
   - Railway-specific considerations

7. **[Railway Deployment](07-railway-deployment.md)**
   - Platform overview and setup
   - Environment variable management
   - Monitoring and debugging
   - Common issues and solutions

8. **[Implementation Patterns](08-implementation-patterns.md)**
   - Complete, production-ready code examples
   - Flask API implementation
   - CLI tool
   - Usage examples (cURL, Python client)

9. **[Alternative Approaches](09-alternative-approaches.md)**
   - Pure Pypandoc approach
   - Node.js alternatives
   - Go minimal footprint
   - Hybrid architectures
   - Decision matrix

## Key Features Covered

✅ Parse markdown files with YAML front matter (--- property: value ---)
✅ Convert markdown to Word (.docx) format
✅ Convert markdown to PDF format
✅ Add page numbers to both document types
✅ Render markdown nicely (headings, lists, code blocks, bold, italic, links, images)
✅ Extract and display front matter at the top of documents
✅ Docker containerization
✅ Railway deployment
✅ Minimal dependencies and efficient implementation

## Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Create project structure
- [ ] Set up Python virtual environment
- [ ] Install dependencies from requirements.txt
- [ ] Create basic Flask application
- [ ] Test pypandoc installation

### Phase 2: Core Functionality (Day 2-3)
- [ ] Implement MarkdownConverter class
- [ ] Add front matter parsing
- [ ] Implement Word conversion
- [ ] Implement PDF conversion with CSS styling
- [ ] Add page numbering to both formats
- [ ] Test with sample markdown files

### Phase 3: API Development (Day 4)
- [ ] Create Flask REST API endpoints
- [ ] Add file upload handling
- [ ] Add JSON content handling
- [ ] Implement error handling
- [ ] Add health check endpoint

### Phase 4: Containerization (Day 5)
- [ ] Create Dockerfile
- [ ] Set up .dockerignore
- [ ] Build and test Docker image locally
- [ ] Optimize image size
- [ ] Test container startup and shutdown

### Phase 5: Deployment (Day 6)
- [ ] Create Railway project
- [ ] Configure environment variables
- [ ] Set up railway.toml
- [ ] Deploy to Railway
- [ ] Test production endpoints
- [ ] Monitor logs and performance

### Phase 6: Testing & Documentation (Day 7)
- [ ] Write unit tests
- [ ] Create API documentation
- [ ] Write user guide
- [ ] Document deployment process
- [ ] Create example markdown files

## Quick Reference: Core Commands

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py

# Test conversion
curl -X POST http://localhost:8080/convert/docx \
  -F "file=@test.md" --output output.docx
```

### Docker

```bash
# Build image
docker build -t md-converter .

# Run container
docker run -p 8080:8080 md-converter

# Test health
curl http://localhost:8080/health
```

### Railway

```bash
# Install CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## Dependencies Summary

### Core Python Packages
```
python-frontmatter==1.0.1    # YAML front matter parsing
pypandoc-binary==1.13        # Pandoc wrapper (includes binary)
markdown==3.6                # Markdown to HTML
weasyprint==62.3             # PDF generation
pygments==2.18.0             # Syntax highlighting
flask==3.0.3                 # Web framework
gunicorn==22.0.0             # WSGI server
```

### System Dependencies (Docker)
```
pandoc                       # Universal document converter
libpango-1.0-0              # WeasyPrint dependency
libpangoft2-1.0-0           # WeasyPrint dependency
libgdk-pixbuf2.0-0          # Image support
```

## Expected Metrics

**Container Size:** ~350MB
**Build Time:** 2-3 minutes
**Startup Time:** 2-5 seconds
**Conversion Time:**
- Small doc (<10KB): <1 second
- Medium doc (100KB): 2-3 seconds
- Large doc (1MB): 5-10 seconds

**Memory Usage:**
- Base: ~100MB
- Per conversion: +50-200MB
- Recommended: 512MB-1GB allocation

## Common Issues & Solutions

### Issue: Pandoc not found
**Solution:** Use `pypandoc-binary` instead of `pypandoc`

### Issue: WeasyPrint rendering errors
**Solution:** Ensure system dependencies installed in Dockerfile

### Issue: Railway deployment fails
**Solution:** Check PORT environment variable binding (0.0.0.0:$PORT)

### Issue: Large files timeout
**Solution:** Increase timeout in gunicorn command and railway.toml

### Issue: Docker image too large
**Solution:** Use multi-stage builds and remove build dependencies

## Resources

### Official Documentation
- [Pandoc User Guide](https://pandoc.org/MANUAL.html)
- [WeasyPrint Documentation](https://doc.courtbouillon.org/weasyprint/)
- [python-frontmatter](https://github.com/eyeseast/python-frontmatter)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Railway Documentation](https://docs.railway.app/)

### Community Resources
- [Stack Overflow - Pandoc](https://stackoverflow.com/questions/tagged/pandoc)
- [Stack Overflow - WeasyPrint](https://stackoverflow.com/questions/tagged/weasyprint)
- [Railway Discord](https://discord.gg/railway)

## Success Criteria

- ✅ Converts markdown with front matter to Word with page numbers
- ✅ Converts markdown with front matter to PDF with page numbers
- ✅ Properly renders all markdown elements (headings, lists, code, images, etc.)
- ✅ Displays front matter at top of generated documents
- ✅ Containerized and deployable on Railway
- ✅ Response time <10s for typical documents
- ✅ Container size <500MB
- ✅ Handles files up to 10MB

## Next Phase: Architecture

After completing this preparation phase, hand off to the **PACT Architect** to:
1. Design system architecture based on recommended stack
2. Create detailed component specifications
3. Define API contracts
4. Plan error handling strategy
5. Design monitoring and logging approach
6. Create deployment pipeline

## Contact & Handoff

**Prepared by:** PACT Preparer
**Date:** 2025-10-31
**Status:** ✅ Complete - Ready for Architecture Phase
**Confidence:** High - All requirements researched and documented

**Handoff to:** PACT Architect for system design phase

---

*This documentation represents comprehensive research into building a production-ready markdown to Word/PDF converter. All recommendations are based on current best practices, library maturity, community adoption, and production deployment considerations as of 2025.*
