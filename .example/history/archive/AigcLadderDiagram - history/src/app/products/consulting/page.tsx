"use client";

import Link from "next/link";
import { ArrowLeft, Users, BookOpen, Wrench, Phone, Mail, MapPin, Clock, CheckCircle } from "lucide-react";
import { useTranslations } from "@/i18n/useTranslations";

export default function ConsultingPage() {
  const t = useTranslations();
  const p = t.productsPage.consulting;

  const CONSULTING_SERVICES = [
    {
      id: "ai-training",
      icon: <BookOpen className="h-8 w-8" />,
      name: p.services.training.name,
      description: p.services.training.desc,
      courses: p.services.training.courses,
    },
    {
      id: "tech-consulting",
      icon: <Wrench className="h-8 w-8" />,
      name: p.services.tech.name,
      description: p.services.tech.desc,
      courses: p.services.tech.courses,
    },
    {
      id: "business-consulting",
      icon: <Users className="h-8 w-8" />,
      name: p.services.business.name,
      description: p.services.business.desc,
      courses: p.services.business.courses,
    },
  ];

  const CONTACT_INFO = [
    { icon: <Phone className="h-5 w-5" />, label: p.contact.phone, value: "400-888-8888" },
    { icon: <Mail className="h-5 w-5" />, label: p.contact.email, value: "consulting@example.com" },
    { icon: <MapPin className="h-5 w-5" />, label: p.contact.address, value: "Beijing, China" },
    { icon: <Clock className="h-5 w-5" />, label: p.contact.workHours, value: "Mon-Fri 9:00-18:00" },
  ];

  return (
    <div className="min-h-screen bg-[#DBDFF9] pt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.common.backToProducts}
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 mb-4">
            <Users className="h-4 w-4" />
            {p.badge}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {p.subtitle}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {p.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {CONSULTING_SERVICES.map((service) => (
            <div
              key={service.id}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                {service.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {service.name}
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.courses.map((course, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-purple-500" />
                    {course}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {p.process.title}
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { step: 1, title: p.process.step1.title, desc: p.process.step1.desc },
              { step: 2, title: p.process.step2.title, desc: p.process.step2.desc },
              { step: 3, title: p.process.step3.title, desc: p.process.step3.desc },
              { step: 4, title: p.process.step4.title, desc: p.process.step4.desc },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center max-w-[180px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {p.contact.title}
          </h2>
          <div className="rounded-2xl bg-white border border-gray-200 p-8 max-w-2xl mx-auto">
            <div className="grid gap-6 sm:grid-cols-2">
              {CONTACT_INFO.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{item.label}</div>
                    <div className="font-medium text-gray-900">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-gray-900 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">{p.cta.title}</h2>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            {p.cta.desc}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium hover:bg-purple-700 transition-colors"
            >
              {t.common.bookConsultation}
            </Link>
            <Link
              href="/docs/help"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 font-medium hover:bg-white/20 transition-colors"
            >
              {t.common.learnMore}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
