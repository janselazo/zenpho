export default function ContactAside() {
  return (
    <aside className="lg:pt-4">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-white to-surface-light/90 p-6 shadow-soft ring-1 ring-black/[0.03] sm:p-7">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent/90">
          Direct
        </p>
        <h3 className="mt-2 text-lg font-bold text-text-primary">Get in touch</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Prefer email? We read every message. A short call is often the fastest way to align on your market, tracking,
          and which plan fits.
        </p>

        <div className="mt-6 space-y-6 border-t border-border/60 pt-6">
          <div>
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              Email
            </h4>
            <a
              href="mailto:hello@zenpho.com"
              className="mt-1.5 inline-block text-sm font-semibold text-text-primary transition-colors hover:text-accent"
            >
              hello@zenpho.com
            </a>
          </div>

          <div>
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              Social
            </h4>
            <div className="mt-2 flex flex-col gap-2">
              <a
                href="https://x.com/zenpho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-primary transition-colors hover:text-accent"
              >
                X / Twitter
              </a>
              <a
                href="https://github.com/zenpho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-primary transition-colors hover:text-accent"
              >
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/company/zenpho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-primary transition-colors hover:text-accent"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-accent/[0.06] px-4 py-3 ring-1 ring-accent/15">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              Response time
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-text-primary">
              We typically reply within <span className="font-semibold">24 hours</span>{" "}
              on business days.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
