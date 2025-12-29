import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ConverterFlow } from '@/components/converter/converter-flow';

export default function Home() {
  return (
    <div className="bg-[#fbf7f1] min-h-screen flex flex-col">
      <Header />

      {/* Page Title Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-[#33475b]">Document Converter</h1>
          <p className="mt-2 text-sm text-gray-600 font-light">
            Convert your markdown and HTML files to Word, PDF, or Google Docs
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-grow w-full">
        <ConverterFlow />
      </main>

      <Footer />
    </div>
  );
}
