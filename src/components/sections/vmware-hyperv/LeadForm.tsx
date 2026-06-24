"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertTriangle, Mail, MessageCircle } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { contact } from "@/config/contact";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";
import { cn } from "@/lib/cn";

const initialValues = {
  name: "",
  email: "",
  company: "",
  phone: "",
  message: "",
};

type FormValues = typeof initialValues;
type FieldName = keyof FormValues;
type FormErrors = Partial<Record<FieldName, string>>;

const labels: Record<FieldName, string> = {
  name: "Nome",
  email: "E-mail",
  company: "Empresa",
  phone: "Telefone",
  message: "Mensagem",
};

const requiredFields: FieldName[] = ["name", "email", "company", "phone"];

const fieldClass =
  "min-h-12 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

export function LeadForm() {
  const { form } = vmwareHypervLanding;
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState("");

  const mailtoHref = useMemo(() => {
    const subject = "Avaliacao VMware para Hyper-V - ServerSafe";
    const body = [
      "Solicitacao de avaliacao para migracao VMware -> Hyper-V",
      "",
      `${labels.name}: ${values.name}`,
      `${labels.email}: ${values.email}`,
      `${labels.company}: ${values.company}`,
      `${labels.phone}: ${values.phone}`,
      "",
      `${labels.message}:`,
      values.message || "Nao informado",
      "",
      "Observacao: nao foram solicitadas senhas, tokens, IPs publicos ou credenciais.",
    ].join("\n");

    return `${contact.emailHref}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [values]);

  const updateValue = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = event.target.name as FieldName;
    const value = event.target.value;

    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus("Revise os campos destacados antes de enviar.");
      return;
    }

    setStatus("Abrindo seu aplicativo de email com a solicitacao estruturada.");
    // Futuramente, substitua o mailto por uma chamada server-side para CRM, webhook ou API.
    window.location.href = mailtoHref;
  };

  return (
    <section id="contato" className="relative overflow-hidden bg-white px-4 py-14 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <SectionIntro
            badge={form.badge}
            title={form.title}
            description={form.description}
            size="large"
          />

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <a
              href={contact.whatsappSupportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-cyan-900 transition hover:border-cyan-300 hover:bg-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {form.whatsappLabel}
            </a>
            <a
              href={contact.emailHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {contact.email}
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <GlassCard className="bg-white px-4 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="name" value={values.name} onChange={updateValue} error={errors.name} autoComplete="name" required />
              <TextField name="email" type="email" value={values.email} onChange={updateValue} error={errors.email} autoComplete="email" required />
              <TextField name="company" value={values.company} onChange={updateValue} error={errors.company} autoComplete="organization" required />
              <TextField name="phone" type="tel" value={values.phone} onChange={updateValue} error={errors.phone} autoComplete="tel" required />
              <TextareaField name="message" value={values.message} onChange={updateValue} error={errors.message} />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-[8px] border border-cyan-200 bg-cyan-50 px-3 py-3 text-sm leading-6 text-slate-600">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
              <p>{form.securityNotice}</p>
            </div>

            <p className="mt-4 min-h-6 text-sm font-semibold text-blue-800" aria-live="polite">
              {status}
            </p>

            <button
              type="submit"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(29,78,216,0.18)] transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {form.submitLabel}
            </button>
          </GlassCard>
        </form>
      </div>
    </section>
  );
}

function TextField({
  name,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  required = false,
}: {
  name: FieldName;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const errorId = `${name}-error`;

  return (
    <div className="grid gap-2">
      <label htmlFor={name} className="text-sm font-bold text-slate-800">
        {labels[name]} {required ? <span className="text-blue-700">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldClass, error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : undefined)}
      />
      {error ? <p id={errorId} className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

function TextareaField({
  name,
  value,
  onChange,
  error,
}: {
  name: FieldName;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <div className="grid gap-2 sm:col-span-2">
      <label htmlFor={name} className="text-sm font-bold text-slate-800">
        {labels[name]}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={5}
        placeholder="Conte o objetivo da migracao, quantidade aproximada de servidores ou principal duvida."
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldClass, "resize-y", error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : undefined)}
      />
      {error ? <p id={errorId} className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

function validate(values: FormValues) {
  const nextErrors: FormErrors = {};

  for (const field of requiredFields) {
    if (!values[field].trim()) {
      nextErrors[field] = "Campo obrigatorio.";
    }
  }

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    nextErrors.email = "Informe um email valido.";
  }

  return nextErrors;
}
