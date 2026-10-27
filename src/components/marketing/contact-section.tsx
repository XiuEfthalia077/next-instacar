"use client";

import { useActionState, useState } from "react";
import {
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Send,
  UserRound,
} from "lucide-react";

import { sendContactMessageAction } from "@/lib/actions/contact";
import { IDLE_STATE } from "@/lib/action-state";
import { CONTACT_SUBJECTS } from "@/lib/constants";

const CUSTOM_SUBJECT = "Other / Custom Subject";

/**
 * "Practical Contact & Support Section" — port of the `<section id="contact">`
 * block of `car-rental/index.php`.
 *
 * The legacy page used Bootstrap's `form-select` for the topic dropdown and a
 * small script that revealed the "custom subject" field when the
 * "Other / Custom Subject" option was picked; both are reproduced here.
 */
export function ContactSection() {
  const [state, formAction, isPending] = useActionState(
    sendContactMessageAction,
    IDLE_STATE,
  );

  const [subject, setSubject] = useState("");
  const showCustomSubject = subject === CUSTOM_SUBJECT;

  const INPUT_CLASS =
    "h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] outline-none transition-all";

  return (
    <section id="contact" className="py-12 md:py-16">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-[#ffcc00]">
                Direct Contact &amp; Support
              </span>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground md:text-5xl">
                Have Questions?
                <br />
                We&apos;re Here to Help.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Need help picking the right vehicle for your group, or have questions about requirements or delivery rates? Reach out to our local team.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#ffcc00]">
                  <Phone className="size-5 text-amber-600 dark:text-[#ffcc00]" />
                </div>
                <div>
                  <h6 className="text-xs font-bold text-foreground">Phone &amp; WhatsApp Support</h6>
                  <span className="text-sm font-semibold text-muted-foreground">+63 (917) 000-0000</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#ffcc00]">
                  <MapPin className="size-5 text-amber-600 dark:text-[#ffcc00]" />
                </div>
                <div>
                  <h6 className="text-xs font-bold text-foreground">Main Dispatch &amp; Pickup Hub</h6>
                  <span className="text-sm font-semibold text-muted-foreground">
                    Pandac, Pavia, 5001 Iloilo, Philippines
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#ffcc00]">
                  <Clock className="size-5 text-amber-600 dark:text-[#ffcc00]" />
                </div>
                <div>
                  <h6 className="text-xs font-bold text-foreground">Operating Dispatch Hours</h6>
                  <span className="text-sm font-semibold text-muted-foreground">
                    Monday to Sunday: 8:00 AM – 8:00 PM
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-card-foreground shadow-sm">
              <h4 className="mb-5 text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                <Mail className="size-5 text-amber-600 dark:text-[#ffcc00]" />
                Send Us a Direct Message
              </h4>

              <form action={formAction} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      className={INPUT_CLASS}
                      placeholder="e.g. Maria Santos"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      className={INPUT_CLASS}
                      placeholder="maria@example.com"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="contact-subject"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      Inquiry Topic <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      className={INPUT_CLASS}
                      required
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    >
                      <option value="" disabled hidden>
                        Select a topic...
                      </option>
                      {CONTACT_SUBJECTS.map((item) => (
                        <option key={item} value={item} className="bg-background text-foreground">
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showCustomSubject ? (
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="contact-custom-subject"
                        className="mb-1.5 block text-xs font-bold text-foreground"
                      >
                        Custom Subject <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="contact-custom-subject"
                        name="custom_subject"
                        type="text"
                        className={INPUT_CLASS}
                        placeholder="Enter your specific subject here..."
                        required
                        autoFocus
                      />
                    </div>
                  ) : null}

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="contact-message"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      Message Details <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={4}
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] outline-none transition-all"
                      placeholder="Please tell us about your planned travel dates, preferred vehicle, or questions..."
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ffcc00] py-3 text-xs sm:text-sm font-black text-black shadow-md transition-all hover:bg-[#ffd633] disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.99]"
                    >
                      <Send className="size-4" />
                      <span>{isPending ? "Sending Message..." : "Submit Inquiry"}</span>
                    </button>
                  </div>
                </div>

                {state.error ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-500"
                  >
                    {state.error}
                  </p>
                ) : null}

                {state.success ? (
                  <p
                    role="status"
                    className="mt-4 rounded-xl border border-[#ffcc00]/40 bg-[#ffcc00]/10 px-4 py-3 text-xs font-bold text-amber-600 dark:text-[#ffcc00]"
                  >
                    {state.success}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
