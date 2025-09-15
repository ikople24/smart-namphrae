import "@/styles/globals.css";
import "sweetalert2/dist/sweetalert2.min.css";
import type { AppProps } from "next/app";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import TermsAgreementModal from "@/components/TermsAgreementModal";
import { useTermsAgreement } from "@/hooks/useTermsAgreement";
import { useEffect, useState } from "react";

function AppContent({ Component, pageProps }: AppProps) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const { hasAcceptedTerms, isLoading, acceptTerms } = useTermsAgreement();
  const [showTermsModal, setShowTermsModal] = useState(false);

  const isProtected = ["/admin"].some((path) =>
    router.pathname.startsWith(path)
  );

  useEffect(() => {
    if (isLoaded && isProtected && !userId) {
      router.replace("/");
    }
  }, [isLoaded, isProtected, userId, router]);

  // Show terms modal if terms haven't been accepted
  useEffect(() => {
    if (!isLoading && !hasAcceptedTerms) {
      setShowTermsModal(true);
    }
  }, [isLoading, hasAcceptedTerms]);

  const handleAcceptTerms = () => {
    acceptTerms();
    setShowTermsModal(false);
  };

  // Show loading while checking terms acceptance
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Show terms modal if not accepted
  if (showTermsModal) {
    return (
      <TermsAgreementModal 
        isOpen={showTermsModal} 
        onAccept={handleAcceptTerms} 
      />
    );
  }

  if (isProtected && (!isLoaded || !userId)) {
    return <div className="p-8 text-center">กำลังโหลด...</div>;
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default function App(props: AppProps) {
  return (
    <ClerkProvider {...props.pageProps}>
      <AppContent {...props} />
    </ClerkProvider>
  );
}
