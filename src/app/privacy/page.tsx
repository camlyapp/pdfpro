'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header onToolSelect={() => {}} />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight text-center">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-stone dark:prose-invert max-w-none space-y-6 text-card-foreground">
              <p className="text-muted-foreground text-center">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">1. Introduction</h2>
                <p>
                  PDFpro ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Services. We do not store your files permanently, and we prioritize your data's security.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">2. Information We Collect</h2>
                <p>
                  When you use our Services, we temporarily process the files you upload. We do not collect personal information from the content of your files. We may collect non-personal information, such as:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-2">
                  <li><strong>Usage Data:</strong> Information about how you use the Services, such as which tools you use and the frequency of use.</li>
                  <li><strong>Device Information:</strong> Information about the device you use to access our Services, such as IP address, browser type, and operating system.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">3. File Handling and Security</h2>
                <p>
                  Your privacy is our top priority. The files you upload for processing are handled as follows:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-2">
                  <li>Files are transmitted over a secure connection (HTTPS).</li>
                  <li>Files are processed in memory or stored temporarily on our servers only for the duration required to perform the requested operation.</li>
                  <li>All uploaded and processed files are automatically and permanently deleted from our servers within one hour of processing. We do not keep any backups of your files.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">4. How We Use Your Information</h2>
                <p>
                  We use the non-personal information we collect to:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-2">
                  <li>Provide, maintain, and improve our Services.</li>
                  <li>Monitor and analyze usage and trends to enhance your experience.</li>
                  <li>Ensure the security of our Services and prevent fraud.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">5. Disclosure of Your Information</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personally identifiable information or your file content to outside parties. We may share aggregated, non-personal information for statistical analysis or to improve our service.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">6. Third-Party Services</h2>
                <p>
                  We may use third-party service providers to help us operate our business and the Services or administer activities on our behalf. These third parties have access to your non-personal information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">7. Children's Privacy</h2>
                <p>
                  Our Services are not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">8. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold border-b pb-2">9. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@pdfpro.app" className="text-primary hover:underline">privacy@pdfpro.app</a>.
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
