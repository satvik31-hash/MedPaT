"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n";

// Cached offline by the service worker and available in Hindi. Five
// situations, each three or four steps, written so someone can follow them
// while frightened.

const CONTENT: Record<Locale, { title: string; steps: string[] }[]> = {
  en: [
    {
      title: "Choking",
      steps: [
        "Ask “are you choking?” If they cannot speak or cough, act now.",
        "Give 5 sharp blows between the shoulder blades with the heel of your hand.",
        "Then 5 abdominal thrusts: stand behind, fist above the navel, pull sharply inward and upward.",
        "Alternate 5 and 5 until the object comes out or help arrives. Call 108.",
      ],
    },
    {
      title: "Severe bleeding",
      steps: [
        "Press hard directly on the wound with a clean cloth. Do not lift to check.",
        "Raise the injured part above the level of the heart if you can.",
        "Add more cloth on top if it soaks through — never remove the first layer.",
        "Call 108. Do not use a tourniquet unless the limb is severed.",
      ],
    },
    {
      title: "Burns",
      steps: [
        "Cool under running water for 20 minutes. Water only.",
        "Remove rings and tight clothing near the burn before swelling starts.",
        "Cover loosely with cling film or a clean cloth.",
        "Never apply ice, toothpaste, oil, butter or haldi.",
      ],
    },
    {
      title: "Seizure (fit)",
      steps: [
        "Do not hold them down and do not put anything in the mouth.",
        "Clear hard objects away. Put something soft under the head.",
        "Time it. After it stops, roll them onto their side.",
        "Call 108 if it lasts over 5 minutes, repeats, or they do not wake up.",
      ],
    },
    {
      title: "Chest pain",
      steps: [
        "Sit them down, leaning back, knees bent. Loosen tight clothing.",
        "Call 108 immediately. Do not drive them yourself.",
        "If they are not allergic to aspirin and are conscious, one 300 mg aspirin, chewed.",
        "If they stop breathing, start chest compressions: centre of the chest, hard and fast.",
      ],
    },
  ],
  hi: [
    {
      title: "गला घुटना",
      steps: [
        "पूछें “क्या आपका गला घुट रहा है?” अगर वे बोल या खाँस नहीं पा रहे, तुरंत मदद करें।",
        "हथेली के निचले हिस्से से कंधों के बीच 5 बार ज़ोर से मारें।",
        "फिर 5 बार पेट पर दबाव: पीछे खड़े हों, नाभि के ऊपर मुट्ठी रखें, अंदर और ऊपर की ओर झटका दें।",
        "5-5 करके दोहराते रहें जब तक चीज़ बाहर न आ जाए या मदद न पहुँचे। 108 पर कॉल करें।",
      ],
    },
    {
      title: "तेज़ खून बहना",
      steps: [
        "साफ़ कपड़े से घाव पर सीधे ज़ोर से दबाएँ। देखने के लिए बार-बार न हटाएँ।",
        "हो सके तो घायल हिस्से को हृदय से ऊपर उठाएँ।",
        "कपड़ा भीग जाए तो ऊपर और कपड़ा रखें — पहली परत कभी न हटाएँ।",
        "108 पर कॉल करें। अंग कटा न हो तो टूर्निकेट न लगाएँ।",
      ],
    },
    {
      title: "जलना",
      steps: [
        "20 मिनट तक बहते पानी के नीचे ठंडा करें। सिर्फ़ पानी।",
        "सूजन शुरू होने से पहले अंगूठी और तंग कपड़े हटा दें।",
        "क्लिंग फ़िल्म या साफ़ कपड़े से ढीला ढक दें।",
        "बर्फ़, टूथपेस्ट, तेल, मक्खन या हल्दी कभी न लगाएँ।",
      ],
    },
    {
      title: "दौरा (मिर्गी)",
      steps: [
        "उन्हें पकड़कर रोकें नहीं और मुँह में कुछ भी न डालें।",
        "आसपास की सख़्त चीज़ें हटाएँ। सिर के नीचे कुछ नरम रखें।",
        "समय देखें। दौरा रुकने पर उन्हें करवट पर लिटाएँ।",
        "5 मिनट से ज़्यादा चले, दोबारा हो, या होश न आए तो 108 पर कॉल करें।",
      ],
    },
    {
      title: "सीने में दर्द",
      steps: [
        "उन्हें बैठाएँ, पीठ टिकाकर, घुटने मोड़कर। तंग कपड़े ढीले करें।",
        "तुरंत 108 पर कॉल करें। खुद गाड़ी चलाकर न ले जाएँ।",
        "अगर एस्पिरिन से एलर्जी नहीं है और होश में हैं, तो 300 मि.ग्रा. एस्पिरिन चबाने को दें।",
        "साँस रुक जाए तो छाती के बीचोंबीच तेज़ और ज़ोर से दबाना शुरू करें।",
      ],
    },
  ],
};

export function FirstAid({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState<number | null>(null);
  const items = CONTENT[locale] ?? CONTENT.en;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-line)]">
        <h2 className="font-semibold">{locale === "hi" ? "प्राथमिक उपचार" : "First aid — quick reference"}</h2>
      </div>
      {items.map((item, i) => (
        <div key={item.title} className="border-b border-[var(--color-line)] last:border-0">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left font-medium hover:bg-[var(--color-paper)]"
          >
            {item.title}
            <ChevronDown
              size={18}
              className={`text-[var(--color-ink-3)] transition-transform ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <ol className="px-4 pb-4 space-y-2 list-decimal list-inside text-[0.9375rem] text-[var(--color-ink-2)]">
              {item.steps.map((s, j) => <li key={j}>{s}</li>)}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
