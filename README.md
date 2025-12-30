# Document Converter

[![Try It](https://img.shields.io/badge/Try%20It-converter.synapticlabs.ai-00A99D?style=for-the-badge)](https://converter.synapticlabs.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/ProfSynapse/doc-converter?style=for-the-badge)](https://github.com/ProfSynapse/doc-converter/stargazers)

A privacy-focused, open-source web application that converts Markdown and HTML files to professionally formatted Word (DOCX), PDF, and Google Docs documents.

**[Try it now at converter.synapticlabs.ai](https://converter.synapticlabs.ai)**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

## Features

- **Multi-format conversion**: Markdown/HTML → Word, PDF, Google Docs
- **Rich formatting**: Headings, code blocks, tables, images, lists
- **YAML front matter**: Document metadata parsing
- **Google Docs integration**: OAuth2-based direct upload to Drive
- **Privacy-first**: Files auto-deleted within 1 hour, filenames never stored
- **Admin dashboard**: Analytics with charts and time filtering
- **Open source**: Fully transparent and auditable

## Supported Formats

| Input | Output |
|-------|--------|
| `.md`, `.markdown`, `.txt` | Word (.docx) |
| `.html`, `.htm` | PDF |
| | Google Docs |

## Quick Start

### Option 1: Deploy to Railway (Recommended)

1. Click the "Deploy on Railway" button above
2. Add PostgreSQL database to your project
3. Set environment variables (see below)
4. Done!

### Option 2: Local Development

```bash
# Clone repo
git clone https://github.com/ProfSynapse/doc-converter.git
cd doc-converter

# Start backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://user:pass@localhost:5432/mdconverter
flask db upgrade
python wsgi.py

# Start frontend (new terminal)
cd frontend
npm install
echo "FLASK_API_URL=http://localhost:8080" > .env.local
npm run dev
```

See [Development Guide](docs/DEVELOPMENT.md) for detailed setup instructions.

## Environment Variables

### Required

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `SECRET_KEY` | Backend | Session encryption (generate: `openssl rand -hex 32`) |
| `FLASK_API_URL` | Frontend | Backend URL |
| `JWT_SECRET` | Frontend | Admin auth (generate: `openssl rand -hex 32`) |

### Optional (for Google Docs)

| Variable | Description |
|----------|-------------|
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client secret |

## Admin Dashboard

Access analytics at `/admin/login`:

- Total conversions & success rate
- Conversions over time (line chart)
- Format breakdown (pie chart)
- Time period filtering (1d, 7d, 30d, all)

To create an admin user:

```bash
cd backend
python -c "
from app import create_app
from app.extensions import db
from app.models import AdminUser

app = create_app('production')
with app.app_context():
    admin = AdminUser(username='admin')
    admin.set_password('your_secure_password')
    db.session.add(admin)
    db.session.commit()
"
```

## Privacy & Security

- **No file storage**: Converted files deleted within 1 hour
- **No filename tracking**: Filenames stored as `[redacted]`
- **UUID access**: Files protected by random UUIDs
- **HTTPS**: All traffic encrypted in production
- **Open source**: Full code transparency

## Tech Stack

**Backend**: Python, Flask, SQLAlchemy, PostgreSQL, Pandoc, Playwright

**Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts

## Documentation

- [Development Guide](docs/DEVELOPMENT.md) - Local setup, API endpoints, deployment
- [Privacy Policy](/privacy) - Data handling practices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [Development Guide](docs/DEVELOPMENT.md) for coding guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [converter.synapticlabs.ai](https://converter.synapticlabs.ai)
- [GitHub](https://github.com/ProfSynapse/doc-converter)
- [Synaptic Labs](https://www.synapticlabs.ai)

---

Built with ❤️ by [Synaptic Labs](https://www.synapticlabs.ai)
