import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "@/styles/marketing.css";
import "@/styles/marketing-art.css";

export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-page-bg relative min-h-screen">
      <Navbar />
      <main className="relative z-10 isolate overflow-x-hidden">{children}</main>
      <Footer />
    </div>
  );
}
