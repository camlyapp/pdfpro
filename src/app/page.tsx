import { Header } from '@/components/header';
import { PdfEditor } from '@/components/pdf-editor';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <PdfEditor />
      </main>
    </div>
  );
}
