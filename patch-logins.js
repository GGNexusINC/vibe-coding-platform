const fs = require('fs');
let c = fs.readFileSync('src/app/admin/admin-panel-client.tsx', 'utf8');
c = c.replace(
  '{ slug: "store-attempts", name: "Store Checkout Attempts", desc: "Logs when users click buy to initiate the checkout process." },',
  '{ slug: "store-attempts", name: "Store Checkout Attempts", desc: "Logs when users click buy to initiate the checkout process." },\n      { slug: "login-audits", name: "Login Audits", desc: "Logs when users sign in or sign out of the dashboard." },'
);
fs.writeFileSync('src/app/admin/admin-panel-client.tsx', c);
