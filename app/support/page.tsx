"use client";
import Link from 'next/link';
import { Mail, MessageCircle, Clock, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    question: "How do I get started with Nerlo?",
    answer: "Simply sign up for an account, add your family members, and start creating tasks. Parents can create tasks with descriptions, time estimates, and rewards, while kids can claim and complete them."
  },
  {
    question: "Is Nerlo safe for children?",
    answer: "Yes, Nerlo is designed with children's safety and privacy in mind. Parents have full control over their children's accounts, and we follow strict privacy guidelines for protecting children's information."
  },
  {
    question: "How does the reward system work?",
    answer: "Parents set monetary or non-monetary rewards for tasks. When kids complete tasks, parents review and approve them. Kids can track their earnings and set savings goals within the app."
  },
  {
    question: "Can I use Nerlo on multiple devices?",
    answer: "Yes, Nerlo works on any device with a web browser. Your family's data syncs across all devices in real-time, so everyone can stay updated on task progress."
  },
  {
    question: "How much does Nerlo cost?",
    answer: "Nerlo is currently free during our early access period. We'll announce pricing details as we approach our full launch, and early users will receive special pricing."
  },
  {
    question: "Can I delete my family's data?",
    answer: "Yes, you can delete your account and all associated data at any time. Simply contact us or use the account deletion option in your settings. All data will be permanently removed within 30 days."
  },
  {
    question: "What if I need help setting up my family?",
    answer: "Our support team is happy to help you get started! Send us an email at nerlo@isakfiks.me, and we'll guide you through the setup process and answer any questions you might have."
  }
];

function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors duration-300">
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <h3 className="text-lg font-medium text-gray-900 pr-4">{question}</h3>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-6 pb-5">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function Support() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <Link href="/" className="text-lg font-medium text-gray-900 hover:text-gray-700 transition-colors">
            ← Back to Nerlo
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extralight text-gray-900 mb-6 tracking-tight">How can we help?</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          <div className="text-center p-8 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-lg transition-all duration-300 group">
            <Mail className="w-10 h-10 text-gray-900 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-3">Email Support</h3>
            <p className="text-gray-600 mb-6 font-light">Get help via email</p>
            <a href="mailto:nerlo@isakfiks.me" className="text-gray-900 hover:underline font-medium transition-colors duration-300">
              nerlo@isakfiks.me
            </a>
          </div>

          <div className="text-center p-8 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-lg transition-all duration-300 group">
            <MessageCircle className="w-10 h-10 text-gray-900 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-3">Live Chat</h3>
            <p className="text-gray-600 mb-6 font-light">Chat with our team</p>
            <button className="text-gray-900 hover:underline font-medium transition-colors duration-300">
              Coming soon
            </button>
          </div>

          <div className="text-center p-8 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-lg transition-all duration-300 group">
            <Clock className="w-10 h-10 text-gray-900 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-3">Response Time</h3>
            <p className="text-gray-600 mb-6 font-light">We typically respond within</p>
            <span className="text-gray-900 font-medium text-lg">24 hours</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extralight text-gray-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-gray-600 font-light">Click on any question to see the answer</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openItems.includes(index)}
                onToggle={() => toggleItem(index)}
              />
            ))}
          </div>
        </div>

        <div className="text-center mt-24 p-12 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100">
          <h3 className="text-3xl font-light text-gray-900 mb-4 tracking-wide">Still need help?</h3>
          <p className="text-gray-600 mb-8 font-light text-lg max-w-2xl mx-auto">
            Our friendly support team is here to help you make the most of Nerlo.
          </p>
          <a 
            href="mailto:nerlo@isakfiks.me" 
            className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all duration-300 font-medium hover:shadow-xl hover:scale-105 group"
          >
            Contact Support
            <Mail className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </a>
        </div>
      </div>
    </div>
  );
}
