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

  return (
    <section id="contact" className="py-5">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-4">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="text-sm font-semibold uppercase text-[#ffcc00]">
              Get in Touch
            </span>
            <h2 className="mt-2 mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Have Questions?
              <br />
              We&apos;re Here to Help.
            </h2>
            <p className="mb-4 text-[#6c757d]">
              Need help picking a vehicle or verifying your requirements? Reach
              out to our local support team directly.
            </p>

            <div className="mb-3 flex items-center gap-3">
              <div
                className="icon-circle mb-0 !h-12 !w-12"
                style={{ fontSize: 20 }}
              >
                <Phone className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h6 className="mb-0 font-bold text-white">Phone Number Support</h6>
                <span className="text-sm text-[#6c757d]">+63 (917) 000-0000</span>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <div
                className="icon-circle mb-0 !h-12 !w-12"
                style={{ fontSize: 20 }}
              >
                <MapPin className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h6 className="mb-0 font-bold text-white">Main Pickup Hub</h6>
                <span className="text-sm text-[#6c757d]">
                  Pandac, Pavia, 5001 Iloilo
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="icon-circle mb-0 !h-12 !w-12"
                style={{ fontSize: 20 }}
              >
                <Clock className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h6 className="mb-0 font-bold text-white">Operating Hours</h6>
                <span className="text-sm text-[#6c757d]">
                  Mon - Sun: 8:00 AM - 8:00 PM
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-[1rem] border border-[#6c757d]/25 bg-black p-4 text-white md:p-5">
              <h4 className="mb-4 text-lg font-bold text-white">
                <Mail className="me-2 inline-block h-5 w-5 text-[#ffc107]" aria-hidden />
                Send Us a Message
              </h4>

              <form action={formAction}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-1 block text-sm font-medium text-[#f8f9fa]"
                    >
                      <UserRound className="me-1 inline-block h-4 w-4 text-[#ffc107]" aria-hidden />
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      className="form-control-dark text-white"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-1 block text-sm font-medium text-[#f8f9fa]"
                    >
                      <Mail className="me-1 inline-block h-4 w-4 text-[#ffc107]" aria-hidden />
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      className="form-control-dark text-white"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="contact-subject"
                      className="mb-1 block text-sm font-medium text-[#f8f9fa]"
                    >
                      <MessageSquare className="me-1 inline-block h-4 w-4 text-[#ffc107]" aria-hidden />
                      Subject / Topic
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      className="form-control-dark text-white"
                      required
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    >
                      <option value="" disabled hidden>
                        Select a topic...
                      </option>
                      {CONTACT_SUBJECTS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showCustomSubject ? (
                    <div className="md:col-span-2">
                      <label
                        htmlFor="contact-custom-subject"
                        className="mb-1 block text-sm font-medium text-[#f8f9fa]"
                      >
                        <Pencil className="me-1 inline-block h-4 w-4 text-[#ffc107]" aria-hidden />
                        Custom Subject
                      </label>
                      <input
                        id="contact-custom-subject"
                        name="custom_subject"
                        type="text"
                        className="form-control-dark text-white"
                        placeholder="Enter your specific subject here..."
                        required
                        autoFocus
                      />
                    </div>
                  ) : null}

                  <div className="md:col-span-2">
                    <label
                      htmlFor="contact-message"
                      className="mb-1 block text-sm font-medium text-[#f8f9fa]"
                    >
                      <Pencil className="me-1 inline-block h-4 w-4 text-[#ffc107]" aria-hidden />
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={4}
                      className="form-control-dark text-white"
                      placeholder="How can we assist your journey?"
                      required
                    />
                  </div>

                  <div className="mt-4 md:col-span-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="btn-primary-custom w-full py-3 font-bold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Send className="me-2 inline-block h-4 w-4" aria-hidden />
                      {isPending ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </div>

                {state.error ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    {state.error}
                  </p>
                ) : null}

                {state.success ? (
                  <p
                    role="status"
                    className="mt-4 rounded-xl border border-[#ffcc00]/40 bg-[#ffcc00]/10 px-4 py-3 text-sm text-[#ffcc00]"
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
