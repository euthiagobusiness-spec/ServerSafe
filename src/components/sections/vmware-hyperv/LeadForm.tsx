"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertTriangle, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

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
  "min-h-12 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-700";

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
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{form.badge}</p>
          <h2 className="mt-5 text-balance text-[2.15rem] font-black leading-tight text-slate-950 sm:text-5xl">
            {form.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-500 sm:text-lg">{form.description}</p>

          <div className="mt-8 grid gap-4 text-sm font-semibold text-slate-700">
            <a
              href={contact.whatsappSupportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <MessageCircle className="h-5 w-5 text-blue-700" aria-hidden="true" />
              {form.whatsappLabel}
            </a>
            <a
              href={contact.emailHref}
              className="inline-flex items-center gap-3 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <Mail className="h-5 w-5 text-blue-700" aria-hidden="true" />
              {contact.email}
            </a>
            <a
              href={contact.whatsappSupportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <Phone className="h-5 w-5 text-blue-700" aria-hidden="true" />
              {contact.phone}
            </a>
            <div className="inline-flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden="true" />
              <span>Atendimento remoto para empresas em todo o Brasil</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="bg-white">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <TextField name="name" value={values.name} onChange={updateValue} error={errors.name} autoComplete="name" required />
            <TextField name="email" type="email" value={values.email} onChange={updateValue} error={errors.email} autoComplete="email" required />
            <TextField name="company" value={values.company} onChange={updateValue} error={errors.company} autoComplete="organization" required />
            <TextField name="phone" type="tel" value={values.phone} onChange={updateValue} error={errors.phone} autoComplete="tel" required />
            <TextareaField name="message" value={values.message} onChange={updateValue} error={errors.message} />
          </div>

          <div className="mt-7 flex items-start gap-3 bg-blue-50 px-4 py-4 text-sm leading-6 text-slate-600">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            <p>{form.securityNotice}</p>
          </div>

          <p className="mt-4 min-h-6 text-sm font-semibold text-blue-800" aria-live="polite">
            {status}
          </p>

          <button
            type="submit"
            className="mt-4 inline-flex min-h-12 items-center justify-center bg-blue-700 px-9 py-3 text-sm font-black text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Enviar
          </button>
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
    <div>
      <label htmlFor={name} className="sr-only">
        {labels[name]} {required ? "*" : ""}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={labels[name]}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldClass, error ? "border-red-500 focus:border-red-600" : undefined)}
      />
      {error ? <p id={errorId} className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
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
    <div className="sm:col-span-2">
      <label htmlFor={name} className="sr-only">
        {labels[name]}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={5}
        placeholder={labels[name]}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldClass, "resize-y", error ? "border-red-500 focus:border-red-600" : undefined)}
      />
      {error ? <p id={errorId} className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
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
