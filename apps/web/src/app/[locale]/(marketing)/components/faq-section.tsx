"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export function FaqSection() {
  const t = useTranslations("marketing.faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <section
      className="bg-gray-50 py-20 dark:bg-gray-800/50"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-4">
        <h2
          id="faq-heading"
          className="text-center text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
        >
          {t("heading")}
        </h2>
        <div className="mt-12 space-y-4">
          {items.map((item, idx) => (
            <FaqAccordionItem key={idx} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FaqAccordionItemProps {
  question: string;
  answer: string;
}

function FaqAccordionItem({ question, answer }: FaqAccordionItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-medium text-gray-900 dark:text-white">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">{answer}</p>
        </div>
      )}
    </div>
  );
}
