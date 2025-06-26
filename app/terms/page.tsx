import Link from 'next/link';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <Link href="/" className="text-lg font-medium text-gray-900 hover:text-gray-700 transition-colors">
            ← Back to Nerlo
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-16">
        <h1 className="text-4xl font-light text-gray-900 mb-8">Terms of Service</h1>
        <p className="text-gray-600 mb-12">Last updated: June 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              By accessing and using Nerlo, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Nerlo is a family task management platform that helps families organize chores, track progress, and manage rewards. 
              The service is designed for use by families with children under parental supervision.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">3. User Accounts and Responsibilities</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Parents or legal guardians must create and manage family accounts. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Supervising children's use of the service</li>
              <li>Ensuring all information provided is accurate</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">4. Children's Privacy and Safety</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Nerlo is designed with families in mind. We are committed to protecting children's privacy and require parental 
              consent for children under 13. Parents maintain full control over their children's accounts and data.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">5. Prohibited Uses</h2>
            <p className="text-gray-600 leading-relaxed mb-4">You may not use Nerlo to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Violate any local, state, national, or international law</li>
              <li>Transmit any harmful, threatening, or inappropriate content</li>
              <li>Impersonate another person or entity</li>
              <li>Interfere with or disrupt the service</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Nerlo is provided "as is" without warranties of any kind. We shall not be liable for any indirect, 
              incidental, special, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">7. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to modify these terms at any time. Users will be notified of significant changes 
              via email or through the service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">8. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@isakfiks.me" className="text-gray-900 hover:underline">legal@isakfiks.me</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
