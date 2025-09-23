// src/sections/Contact.jsx
import React, { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, MessageSquare, Send, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import emailjs from "@emailjs/browser";
import Navbar from "./Navbar";

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, delay: d }
});

// Read EmailJS env (Vite). If you’re on CRA/Next, swap prefixes accordingly.
const EMAILJS = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY
};

export default function Contact() {
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", botField: "" });
  const statusRef = useRef(null);

  const valid = useMemo(() => {
    const emailOk = /^\S+@\S+\.\S+$/.test(form.email);
    return form.name.trim() && emailOk && form.message.trim();
  }, [form]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    if (form.botField) return; // honeypot
    if (!valid) {
      setStatus({ type: "error", msg: "Please fill your name, a valid email, and a message." });
      statusRef.current?.focus();
      return;
    }

    if (!EMAILJS.SERVICE_ID || !EMAILJS.TEMPLATE_ID || !EMAILJS.PUBLIC_KEY) {
      setStatus({
        type: "error",
        msg: "Email service is not configured. Add your EmailJS IDs/keys to .env."
      });
      statusRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const templateParams = {
        name: form.name,
        email: form.email,
        reply_to: form.email, // appears in body
        subject: form.subject || "Message from CosmoMinds",
        message: form.message
      };

      // ✅ Use the EMAILJS constants, not bare identifiers
      await emailjs.send(
        EMAILJS.SERVICE_ID,
        EMAILJS.TEMPLATE_ID,
        templateParams,
        { publicKey: EMAILJS.PUBLIC_KEY }
      );

      setStatus({ type: "ok", msg: "Thanks! Your message was sent. We'll reply soon." });
      setForm({ name: "", email: "", subject: "", message: "", botField: "" });
    } catch (err) {
      console.error("EmailJS send failed:", err, err?.text);
      let friendly = "Sorry, something went wrong. You can email us directly at hello@cosmominds.dev.";
      const msg = (err?.text || err?.message || "").toLowerCase();
      if (msg.includes("origin")) {
        friendly = "This site isn’t allowed in EmailJS Origins. Add your dev/prod URLs in EmailJS → Account → Security → Origins.";
      } else if (msg.includes("template") || msg.includes("param")) {
        friendly = "Template variables don’t match. Make sure your EmailJS template uses from_name, from_email, reply_to, subject, message.";
      } else if (msg.includes("unauthorized") || msg.includes("public key") || msg.includes("404")) {
        friendly = "EmailJS IDs/keys look incorrect. Double-check Service ID, Template ID, and your Public Key.";
      } else if (msg.includes("quota")) {
        friendly = "Email quota exceeded for your EmailJS plan.";
      }
      setStatus({ type: "error", msg: friendly });
    } finally {
      setLoading(false);
      statusRef.current?.focus();
    }
  };

  return (
    <div>
      <Navbar />
      <main id="main" className="relative min-h-screen w-full bg-[#0c0f1b]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(59,130,246,0.25),transparent),radial-gradient(700px_400px_at_90%_10%,rgba(16,185,129,0.18),transparent)]" />

        <section className="relative z-10 mx-auto max-w-6xl px-6 pt-28 pb-16">
          <motion.div {...fade(0)}>
            <p className="text-teal-300/90 font-semibold tracking-wide">Contact</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-white">Let’s build climate wonder, together.</h1>
            <p className="mt-3 max-w-3xl text-white/80">
              Questions, collaboration, or feedback for the NASA Space Apps challenge entry? Send us a note — we’d love to hear from you.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-6 md:grid-cols-5">
            {/* Cards */}
            <motion.div className="md:col-span-2 grid gap-4" {...fade(0.05)}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"><Mail className="text-teal-300" /></div>
                  <div>
                    <div className="text-white font-semibold">Email</div>
                    <a href="mailto:mindscosmo@gmail.com" className="text-sm text-white/80 hover:text-white">mindscosmo@gmail.com</a>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"><Phone className="text-blue-300" /></div>
                  <div>
                    <div className="text-white font-semibold">Phone</div>
                    <div className="text-sm text-white/80">+880 16704XXXX (placeholder)</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"><MapPin className="text-purple-300" /></div>
                  <div>
                    <div className="text-white font-semibold">Location</div>
                    <div className="text-sm text-white/80">Global • Remote first</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"><MessageSquare className="text-amber-300" /></div>
                  <div>
                    <div className="text-white font-semibold">Response time</div>
                    <div className="text-sm text-white/80">Usually within 1–2 days</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={onSubmit}
              className="md:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
              {...fade(0.1)}
              noValidate
            >
              {/* Honeypot */}
              <input type="text" name="botField" value={form.botField} onChange={onChange} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="text-sm text-white/80">Your name</label>
                  <input
                    id="name" name="name" value={form.name} onChange={onChange} required autoComplete="name"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-teal-300/50"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="text-sm text-white/80">Email</label>
                  <input
                    id="email" name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-teal-300/50"
                    placeholder="jane@email.com"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="subject" className="text-sm text-white/80">Subject</label>
                <input
                  id="subject" name="subject" value={form.subject} onChange={onChange} autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-teal-300/50"
                  placeholder="Partnership, feedback, question…"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="message" className="text-sm text-white/80">Message</label>
                <textarea
                  id="message" name="message" rows={6} value={form.message} onChange={onChange} required
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-teal-300/50"
                  placeholder="Tell us how we can help."
                />
              </div>

              {/* Status (screen-reader friendly) */}
              {status.msg && (
                <div
                  ref={statusRef}
                  tabIndex={-1}
                  aria-live="polite"
                  className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    status.type === "ok" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {status.type === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {status.msg}
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  disabled={loading || !valid}
                  className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 font-semibold hover:bg-white/90 disabled:opacity-60"
                  type="submit"
                  aria-busy={loading ? "true" : "false"}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {loading ? "Sending…" : "Send message"}
                </button>
                <span className="text-xs text-white/60">We never share your info.</span>
              </div>
            </motion.form>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <h3 className="text-white font-bold text-lg">Prefer email?</h3>
            <p className="text-white/80 text-sm mt-1">
              mindscosmo@gmail.com — include links or attachments if needed.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
