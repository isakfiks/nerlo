import Link from 'next/link';

export default function Privacy() {
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
        <h1 className="text-4xl font-light text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-gray-600 mb-12">Last updated: June 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We collect information you provide directly to us, such as:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Account information (name, email, family member details)</li>
              <li>Task and completion data</li>
              <li>Usage information and preferences</li>
              <li>Communication with our support team</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">2. Children&apos;s Privacy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We are committed to protecting children&apos;s privacy. For children under 13:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>We require verifiable parental consent before collecting any personal information</li>
              <li>Parents can review, modify, or delete their child&apos;s information at any time</li>
              <li>We collect only the minimum information necessary for the service</li>
              <li>We do not share children&apos;s information with third parties for marketing purposes</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide and maintain the Nerlo service</li>
              <li>Track task completion and manage rewards</li>
              <li>Send important service notifications</li>
              <li>Improve our service and develop new features</li>
              <li>Respond to customer support requests</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties. 
              We may share information only in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>With service providers who assist in operating our service (under strict confidentiality agreements)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We implement appropriate security measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information</li>
              <li>Secure data centers and infrastructure</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-600 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Access and review your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We retain your information only as long as necessary to provide the service or as required by law. 
              When you delete your account, we will delete your personal information within 30 days.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">8. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
              <a href="mailto:privacy@isakfiks.me" className="text-gray-900 hover:underline">privacy@isakfiks.me</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
