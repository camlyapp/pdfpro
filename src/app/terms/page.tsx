'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header onToolSelect={() => {}} />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight text-center">Terms of Service</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-stone dark:prose-invert max-w-none space-y-6 text-card-foreground">
              <p className="text-muted-foreground text-center">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">1. Introduction</h2>
                <p>
                  Welcome to PDFpro ("we," "us," or "our"). By accessing or using our website and services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">2. Use of Our Services</h2>
                <p>
                  You may use our Services only for lawful purposes and in accordance with these Terms. You are responsible for any content you upload, process, or create using our Services. You agree not to use the Services:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-2">
                  <li>In any way that violates any applicable federal, state, local, or international law or regulation.</li>
                  <li>To transmit any material that is abusive, harassing, defamatory, or obscene.</li>
                  <li>To infringe upon the intellectual property rights of others.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">3. User Content</h2>
                <p>
                  We do not claim ownership of the documents you process through our Services. You are solely responsible for your content and the consequences of processing it. We do not store your files on our servers beyond the time necessary to process them. All processed files are automatically deleted from our servers within a short period.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">4. Intellectual Property</h2>
                <p>
                  The Services and their original content, features, and functionality are and will remain the exclusive property of PDFpro and its licensors. The Services are protected by copyright, trademark, and other laws of both the United States and foreign countries.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">5. Disclaimers</h2>
                <p>
                  Our Services are provided on an "AS IS" and "AS AVAILABLE" basis. We make no representations or warranties of any kind, express or implied, as to the operation of our Services or the information, content, or materials included therein. You expressly agree that your use of the Services is at your sole risk.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">6. Limitation of Liability</h2>
                <p>
                  In no event shall PDFpro, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Services.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">7. Governing Law</h2>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">8. Changes to Terms</h2>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page. Your continued use of the Services after any such changes constitutes your acceptance of the new Terms.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">9. Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us at <a href="mailto:support@pdfpro.app" className="text-primary hover:underline">support@pdfpro.app</a>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
