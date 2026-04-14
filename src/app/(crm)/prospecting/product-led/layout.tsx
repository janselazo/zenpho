import ProductLedShell from "./ProductLedShell";

export default function ProductLedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-8">
      <ProductLedShell>{children}</ProductLedShell>
    </div>
  );
}
