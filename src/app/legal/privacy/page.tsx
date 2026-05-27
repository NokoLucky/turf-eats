export default function PrivacyPolicyPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
      
      <section className="mt-8">
        <h2 className="text-xl font-bold">1. Introduction</h2>
        <p>
          Pin2You ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service").
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">2. Information We Collect</h2>
        <h3 className="text-lg font-semibold mt-4">Personal Data</h3>
        <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you, including email addresses, phone numbers, and physical delivery addresses.</p>
        
        <h3 className="text-lg font-semibold mt-4">Location Data (CRITICAL)</h3>
        <p>
          <strong>For Drivers:</strong> We collect precise location data when the app is running in the foreground or background to enable delivery tracking, order assignment, and real-time status updates for customers. This is essential for the operation of the delivery network.
        </p>
        <p>
          <strong>For Customers:</strong> We collect location data to help you set your delivery address and track your order during transit.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">3. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>To provide and maintain our Service.</li>
          <li>To notify you about changes to our Service.</li>
          <li>To allow you to participate in interactive features.</li>
          <li>To provide customer support.</li>
          <li>To process payments and manage orders.</li>
          <li>To improve the safety and security of our users.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">4. Data Sharing</h2>
        <p>We share necessary information between Customers, Drivers, and Store Owners to facilitate the fulfillment of orders. For example, a driver will see your address and name to complete a delivery.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">5. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact our support team via the help center in the app.</p>
      </section>
    </div>
  );
}
