import { useState } from "react";
import { client } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  inquiry_type: string;
  field_of_expertise: string;
  message: string;
}

const initialForm: FormData = {
  name: "",
  email: "",
  company: "",
  industry: "",
  inquiry_type: "client",
  field_of_expertise: "",
  message: "",
};

export default function Contact() {
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await client.entities.contact_submissions.create({
        data: {
          name: formData.name,
          email: formData.email,
          company: formData.company || "",
          industry: formData.industry || "",
          inquiry_type: formData.inquiry_type,
          field_of_expertise: formData.field_of_expertise || "",
          message: formData.message,
        },
      });
      setIsSubmitted(true);
      setFormData(initialForm);
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact us directly via email.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCandidate = formData.inquiry_type === "candidate";

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-[#222c4a] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">
            Get in Touch
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">
            Contact Us
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Whether you're a client looking for workforce solutions or a
            candidate seeking new opportunities, we'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-16">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-[#222c4a] mb-6">
                How to Reach Us
              </h2>
              <p className="text-[#5a6275] leading-relaxed mb-8">
                Our team is ready to assist you with workforce solutions
                tailored to your needs. Reach out through any of the channels
                below.
              </p>

              {/* HQ Netherlands */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#222c4a] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#407df1]" />
                  HQ Netherlands
                </h3>
                <div className="space-y-4 pl-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#407df1]/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#407df1]" />
                    </div>
                    <div>
                      <p className="text-[#5a6275] text-sm">
                        Tennesseedreef 7e, 3565 CK Utrecht
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#407df1]/10 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-[#407df1]" />
                    </div>
                    <div>
                      <p className="text-[#5a6275] text-sm">+31 850 711 950</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#407df1]/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-[#407df1]" />
                    </div>
                    <div>
                      <p className="text-[#5a6275] text-sm">netherlands@confair.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* HQ Middle East */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#222c4a] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#fbc134]" />
                  HQ Middle East – Dubai
                </h3>
                <div className="space-y-4 pl-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#fbc134]/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#fbc134]" />
                    </div>
                    <div>
                      <p className="text-[#5a6275] text-sm">
                        The Prime Tower, Office 2001-25, Business Bay, Dubai
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#fbc134]/10 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-[#fbc134]" />
                    </div>
                    <div>
                      <p className="text-[#5a6275] text-sm">+971 55 692 4772</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#fbc134]/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-[#fbc134]" />
                    </div>
                    <div>
                      <p className="text-[#5a6275] text-sm">uae@confair.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#407df1]/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#407df1]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#222c4a] mb-1">
                    Business Hours
                  </h4>
                  <p className="text-[#5a6275] text-sm">
                    Mon – Fri: 08:00 – 18:00 CET / GST
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-10 p-6 bg-[#f2eee7] rounded-2xl">
                <h4 className="font-bold text-[#222c4a] mb-3">Quick Links</h4>
                <div className="space-y-2">
                  <a
                    href="mailto:aviation@confair.com"
                    className="block text-sm text-[#407df1] hover:underline"
                  >
                    Aviation inquiries → aviation@confair.com
                  </a>
                  <a
                    href="mailto:maritime@confair.com"
                    className="block text-sm text-[#407df1] hover:underline"
                  >
                    Maritime inquiries → maritime@confair.com
                  </a>
                  <a
                    href="mailto:offshore@confair.com"
                    className="block text-sm text-[#407df1] hover:underline"
                  >
                    Offshore inquiries → offshore@confair.com
                  </a>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              {isSubmitted ? (
                <div className="bg-[#f2eee7] rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#222c4a] mb-3">
                    Thank You!
                  </h3>
                  <p className="text-[#5a6275] text-lg mb-6">
                    Your message has been received. Our team will get back to
                    you within 24 hours.
                  </p>
                  <Button
                    onClick={() => setIsSubmitted(false)}
                    className="bg-[#222c4a] text-white hover:bg-[#1a2340]"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <div className="bg-[#f2eee7] rounded-2xl p-8 md:p-10">
                  <h3 className="text-2xl font-bold text-[#222c4a] mb-2">
                    Send Us a Message
                  </h3>
                  <p className="text-[#5a6275] mb-8">
                    Fill out the form below and we'll respond promptly.
                  </p>

                  {/* Inquiry Type Toggle */}
                  <div className="flex gap-3 mb-8">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, inquiry_type: "client" })
                      }
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        !isCandidate
                          ? "bg-[#222c4a] text-white"
                          : "bg-white text-[#5a6275] hover:bg-gray-50"
                      }`}
                    >
                      <Building2 className="w-4 h-4" /> I'm a Client
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, inquiry_type: "candidate" })
                      }
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isCandidate
                          ? "bg-[#222c4a] text-white"
                          : "bg-white text-[#5a6275] hover:bg-gray-50"
                      }`}
                    >
                      <User className="w-4 h-4" /> I'm a Candidate
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <Label
                          htmlFor="name"
                          className="text-[#222c4a] font-semibold text-sm mb-1.5 block"
                        >
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="Your full name"
                          className="bg-white border-gray-200 focus:border-[#407df1] focus:ring-[#407df1]"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="email"
                          className="text-[#222c4a] font-semibold text-sm mb-1.5 block"
                        >
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="your@email.com"
                          className="bg-white border-gray-200 focus:border-[#407df1] focus:ring-[#407df1]"
                        />
                      </div>
                    </div>

                    {!isCandidate ? (
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <Label
                            htmlFor="company"
                            className="text-[#222c4a] font-semibold text-sm mb-1.5 block"
                          >
                            Company Name
                          </Label>
                          <Input
                            id="company"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="Your company"
                            className="bg-white border-gray-200 focus:border-[#407df1] focus:ring-[#407df1]"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="industry"
                            className="text-[#222c4a] font-semibold text-sm mb-1.5 block"
                          >
                            Industry
                          </Label>
                          <Select
                            value={formData.industry}
                            onValueChange={(val) =>
                              setFormData({ ...formData, industry: val })
                            }
                          >
                            <SelectTrigger className="bg-white border-gray-200">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aviation">Aviation</SelectItem>
                              <SelectItem value="maritime">Maritime</SelectItem>
                              <SelectItem value="offshore">
                                Offshore Energy
                              </SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label
                          htmlFor="field_of_expertise"
                          className="text-[#222c4a] font-semibold text-sm mb-1.5 block"
                        >
                          Field of Expertise
                        </Label>
                        <Select
                          value={formData.field_of_expertise}
                          onValueChange={(val) =>
                            setFormData({
                              ...formData,
                              field_of_expertise: val,
                            })
                          }
                        >
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue placeholder="Select your field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aviation_engineering">
                              Aviation Engineering
                            </SelectItem>
                            <SelectItem value="cabin_crew">
                              Cabin Crew
                            </SelectItem>
                            <SelectItem value="ground_operations">
                              Ground Operations
                            </SelectItem>
                            <SelectItem value="deck_officer">
                              Deck Officer
                            </SelectItem>
                            <SelectItem value="marine_engineer">
                              Marine Engineer
                            </SelectItem>
                            <SelectItem value="offshore_technician">
                              Offshore Technician
                            </SelectItem>
                            <SelectItem value="hse_officer">
                              HSE Officer
                            </SelectItem>
                            <SelectItem value="project_engineer">
                              Project Engineer
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label
                        htmlFor="message"
                        className="text-[#222c4a] font-semibold text-sm mb-1.5 block"
                      >
                        Message *
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder={
                          isCandidate
                            ? "Tell us about your experience, certifications, and what opportunities you're looking for..."
                            : "Describe your workforce requirements, timeline, and any specific certifications needed..."
                        }
                        className="bg-white border-gray-200 focus:border-[#407df1] focus:ring-[#407df1] resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#fbc134] text-[#222c4a] hover:bg-[#e5af2e] font-bold py-3 text-base"
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Send className="w-4 h-4" /> Send Message
                        </span>
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}