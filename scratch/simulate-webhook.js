
async function run() {
  const payload = {
    event_type: "PAYMENT.SALE.COMPLETED",
    resource: {
      id: "SIMULATED_TEST_TXN_" + Date.now(),
      amount: { total: "5.00", currency: "USD" },
      state: "completed",
      payer_email: "test-buyer@example.com",
      custom: "940804710267486249|Kilo|construction|TRACKING-KILO-TEST"
    }
  };

  console.log("Sending simulation payload for Kilo...");
  
  const res = await fetch("https://newhopeggn.vercel.app/api/webhooks/paypal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("Response Status:", res.status);
  console.log("Response Body:", text);
}

run();
