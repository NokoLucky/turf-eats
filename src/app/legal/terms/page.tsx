export default function TermsOfServicePage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

      <section className="mt-8">
        <h2 className="text-xl font-bold">1. Agreement to Terms</h2>
        <p>
          By accessing or using Pin2You, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">2. Use of Service</h2>
        <p>
          You must be at least 18 years old to use this Service. You are responsible for maintaining the confidentiality of your account and password.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">3. Orders and Payments</h2>
        <p>
          Pin2You facilitates the ordering of products from local stores. We are not responsible for the quality of food or products provided by third-party stores. 
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Prices are determined by the stores and are subject to change.</li>
          <li>Delivery fees and service fees are added at checkout.</li>
          <li>Cancellations are only permitted before the store begins preparing the order.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">4. Driver Conduct</h2>
        <p>
          Drivers are independent contractors and not employees of Pin2You. They are required to maintain valid licenses and insurance as required by local law.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">5. Limitation of Liability</h2>
        <p>
          In no event shall Pin2You be liable for any indirect, incidental, special, or consequential damages resulting from the use of the service.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">6. Modifications</h2>
        <p>
          We reserve the right to modify these terms at any time. We will notify users of significant changes by posting a notice in the app.
        </p>
      </section>
    </div>
  );
}
