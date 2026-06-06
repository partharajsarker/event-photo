export const metadata = {
  title: "Privacy Policy - Event Photography",
  description: "Privacy policy for our event photo sharing service",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold text-white">Privacy Policy</h1>

        <p className="mb-8 text-zinc-400">
          We respect your privacy and are committed to protecting the personal
          data of users who access this photo sharing service.
        </p>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">
            1. Information We Collect
          </h2>
          <p className="mb-2">We may collect and store:</p>
          <ul className="list-disc space-y-1 pl-6 text-zinc-400">
            <li>Photos uploaded by photographers or users</li>
            <li>Device information (browser type, access time)</li>
            <li>Event access data (QR scan or gallery visits)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">
            2. How We Use Information
          </h2>
          <p className="mb-2">We use the collected data only for:</p>
          <ul className="list-disc space-y-1 pl-6 text-zinc-400">
            <li>Storing and displaying event photos</li>
            <li>Allowing users to view and download photos via QR code</li>
            <li>Managing event-based photo galleries</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">
            3. Data Sharing
          </h2>
          <p className="text-zinc-400">
            We do not sell or share your personal data with third parties.
          </p>
          <p className="mt-2 text-zinc-400">
            Photos are only accessible to people who have the correct event link
            or QR code.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">
            4. Data Storage
          </h2>
          <p className="text-zinc-400">
            All photos are securely stored in cloud storage and protected using
            access control rules.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">
            5. User Access
          </h2>
          <p className="text-zinc-400">
            Only users with the correct QR code or link can access event photos.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">
            6. Data Deletion
          </h2>
          <p className="text-zinc-400">
            Event organizers can request deletion of photos at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">7. Contact</h2>
          <p className="text-zinc-400">
            If you have any questions about this privacy policy, please contact
            the event organizer or platform administrator.
          </p>
        </section>

        <footer className="mt-12 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          <p>
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </footer>
      </div>
    </main>
  );
}
