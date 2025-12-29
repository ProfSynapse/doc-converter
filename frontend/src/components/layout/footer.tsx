import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-12 bg-white border-t-2 border-[#00A99D]">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-600 font-light">
          &copy; {new Date().getFullYear()} Document Converter. Files are encrypted at rest and automatically deleted within 1 hour.
        </p>
        <p className="text-center text-xs text-gray-500 font-light mt-2">
          <Link
            href="/privacy"
            className="text-[#00A99D] hover:text-[#00A99D]/80 font-medium transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="mx-2 text-gray-400">•</span>
          <a
            href="https://github.com/ProfSynapse/doc-converter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00A99D] hover:text-[#00A99D]/80 font-medium transition-colors"
          >
            Open Source
          </a>
        </p>
      </div>
    </footer>
  );
}
