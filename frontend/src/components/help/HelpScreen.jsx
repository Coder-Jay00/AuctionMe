'use client';

import { useMemo, useState } from 'react';
import BidderShell from '../layout/BidderShell';
import AuthStatusAlert from '../auth/AuthStatusAlert';

const HELP_TOPICS = [
  {
    id: 'faq-bid',
    category: 'faqs',
    question: 'How to place a bid?',
    answer:
      'Open any LIVE auction from the Live Floor, enter an amount in INR equal to or above the displayed Minimum Next Bid, and click Place Bid. The Express backend validates your bid inside a PostgreSQL row-locked transaction before confirming acceptance.',
  },
  {
    id: 'faq-increment',
    category: 'rules',
    question: 'What is a minimum increment?',
    answer:
      'Every auction defines a fixed minimum increment in paise (displayed in INR). Any new bid must be greater than or equal to the current highest price plus the minimum increment; lower or equal bids are rejected without changing the auction state.',
  },
  {
    id: 'faq-antisnipe',
    category: 'rules',
    question: 'How does the anti-sniping extension work?',
    answer:
      'If a valid bid is accepted when 30 seconds or less remain according to PostgreSQL authoritative time (clock_timestamp()), the server atomically extends the auction end time by exactly 30 seconds. Rejected bids and bids with more than 30 seconds remaining never extend the deadline.',
  },
  {
    id: 'faq-winner',
    category: 'guides',
    question: 'When and how is the winner decided?',
    answer:
      'Once the authoritative server deadline passes, the background closing worker locks the auction row with FOR UPDATE SKIP LOCKED, atomically transitions the status to CLOSED, and assigns winner_id to the highest accepted bidder (or null if no bids were accepted).',
  },
  {
    id: 'faq-history',
    category: 'faqs',
    question: "I can't see my bids. What should I do?",
    answer:
      'Committed accepted bids for an active or closed auction appear immediately in the auction Bid History and on the Auction Result screen. Rejected bids are rolled back transactionally and are not added to the committed bid ledger.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Browse FAQs', desc: 'Common bidding questions' },
  { id: 'guides', label: 'Guides', desc: 'How live auctions work' },
  { id: 'rules', label: 'Auction Rules', desc: 'Increments & anti-sniping' },
  { id: 'contact', label: 'Contact Support', desc: 'Send a message to our team' },
];

export default function HelpScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openTopicId, setOpenTopicId] = useState('faq-bid');

  // Contact Support form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formErrors, setFormErrors] = useState({ subject: null, message: null });
  const [submitError, setSubmitError] = useState(null);

  const visibleTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return HELP_TOPICS.filter((t) => {
      if (
        selectedCategory !== 'all' &&
        selectedCategory !== 'contact' &&
        t.category !== selectedCategory
      ) {
        return false;
      }
      if (q) {
        return (
          t.question.toLowerCase().includes(q) ||
          t.answer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, selectedCategory]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors = {
      subject: !subject ? 'Please select a topic.' : null,
      message:
        message.trim().length < 10
          ? 'Please enter a message of at least 10 characters.'
          : null,
    };
    setFormErrors(nextErrors);

    if (nextErrors.subject || nextErrors.message) return;

    // Never fabricate a successful support submission — no backend support endpoint exists yet.
    setSubmitError(
      'Unable to send message: backend support endpoint (e.g. POST /api/support/tickets) is not yet implemented.'
    );
  };

  return (
    <BidderShell
      activeNav="help"
      title="Help & Support"
      subtitle="Find answers, review auction rules, or contact the AuctionMe team."
    >
      {/* Search Bar */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for help articles, auction rules, or topics..."
          aria-label="Search FAQs and help topics"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-4 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-auctionme-emeraldLight focus:outline-none dark:border-slate-800 dark:bg-[#10171f] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark"
        />
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isActive
                  ? 'border-auctionme-emeraldLight bg-emerald-50/70 dark:border-auctionme-emeraldDark/50 dark:bg-auctionme-emeraldDark/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#10171f] dark:hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {cat.label}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {cat.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Popular Topics / FAQs Accordion */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#10171f]">
        <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Popular Topics
          </h2>
        </div>

        {visibleTopics.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No help topics matched &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
            {visibleTopics.map((topic) => {
              const isOpen = openTopicId === topic.id;
              return (
                <div key={topic.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenTopicId((prev) =>
                        prev === topic.id ? null : topic.id
                      )
                    }
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {topic.question}
                    </span>
                    <span
                      className={`text-slate-400 transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                  {isOpen && (
                    <div className="bg-slate-50/70 px-5 pb-4 pt-1 text-xs leading-relaxed text-slate-600 dark:bg-[#0d131a] dark:text-slate-400">
                      {topic.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Contact Support Form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-[#10171f]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Contact Support
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Need help with a bid, auction rule, or account question? Send us a message.
        </p>

        <form onSubmit={handleContactSubmit} noValidate className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="support-subject"
              className="block text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              Subject <span className="text-rose-500">*</span>
            </label>
            <select
              id="support-subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (formErrors.subject) {
                  setFormErrors((p) => ({ ...p, subject: null }));
                }
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-100 dark:focus:border-auctionme-emeraldDark"
            >
              <option value="">Select a topic</option>
              <option value="bidding">Bidding &amp; Increments</option>
              <option value="anti-sniping">Anti-Sniping Extension</option>
              <option value="result">Auction Result &amp; Winner</option>
              <option value="account">Account &amp; Access</option>
            </select>
            {formErrors.subject && (
              <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {formErrors.subject}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="support-message"
              className="block text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="support-message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (formErrors.message) {
                  setFormErrors((p) => ({ ...p, message: null }));
                }
              }}
              placeholder="Describe your issue or question..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-auctionme-emeraldLight focus:outline-none dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark"
            />
            {formErrors.message && (
              <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {formErrors.message}
              </p>
            )}
          </div>

          <AuthStatusAlert
            status={submitError ? 'error' : null}
            message={submitError}
          />

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-auctionme-emeraldLight px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-auctionme-emeraldLightHover sm:w-auto dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
          >
            Send Message
          </button>
        </form>
      </section>
    </BidderShell>
  );
}
