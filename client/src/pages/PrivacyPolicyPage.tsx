import React from 'react';

const UPDATED = '28 October 2026';
const CONTACT = 'info@pypeerm.com';

/** Public privacy policy for the Pype ERM web and mobile apps (linked from the Google Play listing). */
export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <main className="max-w-3xl mx-auto px-5 py-10 leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: {UPDATED}</p>

        <p className="mb-4">
          This policy explains how Pype ERM (operated by Prohostix, "we", "us") collects, uses and
          shares information when you use the Pype ERM web application at pypeerm.com and the Pype
          ERM, PSC Skill and ECA Click mobile apps (together, the "Service").
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1. Information we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account details: name, email address, phone number, role and organization.</li>
          <li>Login details: a password (stored only as a salted hash) and session tokens.</li>
          <li>Attendance: punch-in and punch-out times, and a selfie photo taken when you punch in or out.</li>
          <li>Location: the location at punch-in/punch-out, when the app asks for location permission.</li>
          <li>Student and enrollment records: application details, documents you upload (such as certificates and identity documents) and payment and fee records.</li>
          <li>Technical data: device type, app version and error logs, used to keep the Service working.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">2. How we use information</h2>
        <p>
          We use this information to run the Service: to create and manage accounts, record attendance,
          process enrollments and fees, send notifications, keep the apps up to date, prevent misuse and
          meet our legal obligations. We do not sell personal information and do not use it for
          advertising.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">3. Who we share information with</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>The educational institution or organization that owns your account, for its staff who need the data.</li>
          <li>Our hosting provider (Amazon Web Services, India region), which stores the data on our behalf.</li>
          <li>Email providers used to send notifications and account emails.</li>
          <li>Authorities, where required by law.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">4. Permissions the apps request</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Camera: to take the selfie used for punch-in and punch-out, and to upload documents.</li>
          <li>Location: to record where attendance was marked.</li>
          <li>Internet: to connect to the Service.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">5. Retention</h2>
        <p>
          We keep account and academic records for as long as they are needed for the institution's
          records and legal obligations. Attendance photos and location are kept for the period set by
          your organization.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6. Security</h2>
        <p>
          Data is sent over HTTPS and access is limited by role. No system is perfectly secure, so we
          cannot guarantee absolute security.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">7. Your choices and rights</h2>
        <p>
          You can ask to see, correct or delete your personal information by emailing {CONTACT}. Some
          records must be kept by your institution and may not be deleted. You can withdraw camera or
          location permission at any time in your device settings, although attendance will then not
          work.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">8. Children</h2>
        <p>
          The Service is for students, staff and institutions and is not directed at children under 13.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">9. Changes to this policy</h2>
        <p>We will post any changes on this page and update the date above.</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">10. Contact</h2>
        <p>
          Prohostix. Email: <a className="text-blue-600 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </main>
    </div>
  );
}
