import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative marketing-page-bg min-h-screen">
      <Navbar />
      <main className="relative isolate overflow-x-hidden">{children}</main>
      <Footer />
    </div>
  );
}
