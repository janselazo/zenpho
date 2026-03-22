"use client";

import { motion } from "framer-motion";
import BookingCalendar from "./BookingCalendar";

export default function BookingSection() {
  return (
    <section
      id="booking"
      className="mx-auto max-w-7xl px-6 pb-16 lg:px-8"
      aria-label="Book a call"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        <BookingCalendar />
      </motion.div>
    </section>
  );
}
