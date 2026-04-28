"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";

export default function StudioPreviewSection() {
  return (
    <section className="border-y border-border/60 bg-surface/70 py-24 lg:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
        <SectionHeading
          align="center"
          title="Building with founders today."
          titleAccent="Building our own products tomorrow."
          description={
            <>
              <p>
                Zenpho is not just an agency. We are building toward an AI
                Product Studio — a company that helps founders launch technology
                products while also creating our own AI-powered software.
              </p>
              <p className="!mt-4">
                Our client work helps us stay close to real founder problems,
                emerging product opportunities, and fast-moving AI use cases.
              </p>
            </>
          }
        />

        <motion.div
          initial={{ opacity: 1, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45 }}
          className="mt-10"
        >
          <Button href="/studio" variant="primary" size="lg">
            Learn About Zenpho Studio
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
