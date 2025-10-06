'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ShieldCheck, Accessibility } from "lucide-react";

export function HomePageFeatures() {
  const features = [
    {
      icon: <Zap className="h-10 w-10 text-primary" />,
      title: "Powerful & Fast",
      description: "Our tools are designed for maximum speed and efficiency. Process your documents in seconds, not minutes, with our powerful and intuitive interface.",
    },
    {
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      title: "Secure & Private",
      description: "Your privacy is our priority. We process your files securely and automatically delete them from our servers within an hour. We never share your data.",
    },
    {
      icon: <Accessibility className="h-10 w-10 text-primary" />,
      title: "Free & Accessible",
      description: "Access a full suite of PDF tools from any device, anywhere. No software to install and no hidden fees. PDFpro is completely free for everyone.",
    },
  ];

  return (
    <section className="w-full py-20 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            The Ultimate Online PDF Suite
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
            PDFpro provides a complete set of tools to streamline your document workflow. Whether you need to merge, split, compress, or convert, we have you covered with simple, powerful solutions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center p-6 shadow-md hover:shadow-primary/20 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex-col items-center justify-center">
                 <div className="p-4 bg-primary/10 rounded-full mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}