"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Concept = {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  mvpGoal: string;
};

const concepts: Concept[] = [
  {
    id: "ai-proposal-generator",
    name: "AI Proposal Generator",
    category: "AI SaaS / Internal Tool / Founder Demo",
    description:
      "An AI-powered tool that helps agencies, consultants, and freelancers generate client proposals faster.",
    features: [
      "Client/project input form",
      "AI-generated proposal draft",
      "Editable proposal sections",
      "Saved proposals dashboard",
      "Export-ready format",
      "Basic user authentication",
    ],
    mvpGoal:
      "Help service providers reduce proposal creation time and improve sales workflow efficiency.",
  },
  {
    id: "ai-customer-support",
    name: "AI Customer Support Assistant",
    category: "AI Assistant / SaaS MVP",
    description:
      "A support assistant that allows businesses to upload knowledge base content and generate AI-powered answers for customers or internal teams.",
    features: [
      "Knowledge base upload",
      "AI chat interface",
      "Admin dashboard",
      "Conversation history",
      "Source-based responses",
      "Basic analytics",
    ],
    mvpGoal:
      "Validate whether small teams can reduce repetitive support work using a simple AI support workflow.",
  },
  {
    id: "ai-candidate-screener",
    name: "AI Candidate Screener",
    category: "HR Tech / AI Workflow Tool",
    description:
      "A lightweight recruiting MVP that helps teams review resumes, summarize candidate profiles, and rank applicants based on role criteria.",
    features: [
      "Resume upload",
      "AI candidate summaries",
      "Candidate scoring",
      "Role criteria input",
      "Recruiter dashboard",
      "Shortlist management",
    ],
    mvpGoal:
      "Test whether AI can help small hiring teams review candidates faster and more consistently.",
  },
  {
    id: "founder-launch-pages",
    name: "Founder Launch Page System",
    category: "Landing Page / Growth Tool",
    description:
      "A launch page framework designed to help founders validate ideas, collect waitlist signups, and explain their MVP clearly.",
    features: [
      "Positioning structure",
      "Landing page sections",
      "Waitlist form",
      "Demo booking CTA",
      "Analytics setup",
      "Feedback collection",
    ],
    mvpGoal:
      "Help founders test demand before or immediately after MVP launch.",
  },
];

export default function WorkConceptGrid() {
  return (
    <section id="concepts" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
      <SectionHeading
        label="Concepts"
        title="Demo MVPs and studio"
        titleAccent="concepts"
        titleAccentInline
        description="These are exploratory builds — not agency client engagements. Think lab projects and product hypotheses in motion."
      />

      <div className="grid gap-8 lg:gap-10">
        {concepts.map((concept, i) => (
          <motion.article
            key={concept.id}
            id={concept.id}
            initial={{ opacity: 1, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            className="scroll-mt-28"
          >
            <Card className="flex h-full flex-col border-border/80 bg-white p-8 shadow-soft sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
                    {concept.category}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-text-primary sm:text-3xl">
                    {concept.name}
                  </h2>
                </div>
                <Button href="/booking" variant="primary" size="md">
                  View Build
                </Button>
              </div>
              <p className="mt-6 text-base leading-relaxed text-text-secondary">
                {concept.description}
              </p>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  Core features
                </p>
                <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-text-primary/90">
                  {concept.features.map((f) => (
                    <li key={f} className="leading-relaxed">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 rounded-xl bg-surface-light p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  MVP goal
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-text-primary">
                  {concept.mvpGoal}
                </p>
              </div>
            </Card>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
