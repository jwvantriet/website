import { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  Mail,
  Phone,
  MessageSquare,
  Briefcase,
} from "lucide-react";

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacancyTitle: string;
  vacancyId: string;
  applyUrl: string | null;
}

export default function ApplyModal({
  isOpen,
  onClose,
  vacancyTitle,
  vacancyId,
  applyUrl,
}: ApplyModalProps) {
  const [step, setStep] = useState<"form" | "submitting" | "success">("form");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setForm({ firstName: "", lastName: "", email: "", phone: "", message: "" });
      setCvFile(null);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCvFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("submitting");

    // If there's an external apply URL, redirect after a brief delay
    if (applyUrl) {
      setTimeout(() => {
        window.open(applyUrl, "_blank", "noopener,noreferrer");
        setStep("success");
      }, 1000);
      return;
    }

    // Simulate submission (in production, this would POST to the backend)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStep("success");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-[#222c4a] px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-[#fbc134]" />
                <span className="text-[#fbc134] text-xs font-semibold uppercase tracking-wider">
                  Apply for this job
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {vacancyTitle}
              </h2>
              <p className="text-white/50 text-xs mt-1">Ref: {vacancyId}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <User className="w-3 h-3" />
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <User className="w-3 h-3" />
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <Mail className="w-3 h-3" />
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <Phone className="w-3 h-3" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+31 6 12345678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all placeholder:text-gray-300"
                />
              </div>

              {/* CV Upload */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <FileText className="w-3 h-3" />
                  Upload CV / Resume
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#407df1] hover:text-[#407df1] transition-all flex items-center justify-center gap-2 bg-gray-50/50"
                >
                  {cvFile ? (
                    <>
                      <FileText className="w-4 h-4 text-[#407df1]" />
                      <span className="text-[#407df1] font-medium">
                        {cvFile.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose file (PDF, DOC, DOCX)
                    </>
                  )}
                </button>
              </div>

              {/* Message */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Cover Letter / Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us why you're interested in this role..."
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all resize-none placeholder:text-gray-300"
                />
              </div>

              {/* Privacy Notice */}
              <p className="text-xs text-gray-400 leading-relaxed">
                By submitting this application, you agree to our{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  className="text-[#407df1] hover:underline"
                >
                  Privacy Policy
                </a>{" "}
                and consent to the processing of your personal data for
                recruitment purposes.
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#fbc134] text-[#222c4a] py-3.5 rounded-xl font-bold text-sm hover:bg-[#f0b020] transition-colors shadow-lg shadow-[#fbc134]/20"
              >
                Submit Application
              </button>
            </form>
          )}

          {step === "submitting" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-[#407df1] animate-spin mb-4" />
              <p className="text-gray-600 font-medium">
                Submitting your application...
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Please wait a moment.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-[#222c4a] mb-2">
                Application Submitted!
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                Thank you for your interest in this position. Our recruitment
                team will review your application and get back to you shortly.
              </p>
              <button
                onClick={onClose}
                className="bg-[#222c4a] text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-[#1a2340] transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}