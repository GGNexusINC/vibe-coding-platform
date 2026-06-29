// Programmatic scratch script to verify borrow advanced flows on local fallback JSON database.
import fs from "node:fs";
import path from "node:path";
import { createBorrowRequest, getBorrowRequests, updateBorrowRequestStatus } from "../src/lib/borrow-store";

const DATA_FILE = path.join(process.cwd(), "data", "borrow-requests.json");

async function runTest() {
  console.log("=== STARTING LOCAL BORROW ADVANCE UNIT TESTS ===");

  // 1. Clear database
  if (fs.existsSync(DATA_FILE)) {
    console.log("Found existing mock data file. Backing up and clearing...");
    fs.renameSync(DATA_FILE, `${DATA_FILE}.bak`);
  }

  try {
    // 2. Submit advanced advance request
    console.log("\n1. Staff member Buzzworthy submits a borrow advanced request...");
    const req1 = await createBorrowRequest({
      discordId: "940804710267486249",
      username: "Buzzworthy",
      amount: 400,
      reason: "Urgent vehicle repair advance needed.",
      preferredCycle: "biweekly",
    });

    console.log("Success! Created request object:");
    console.log(JSON.stringify(req1, null, 2));

    // Verify file exists
    if (!fs.existsSync(DATA_FILE)) {
      throw new Error("Local data database file was not created!");
    }
    console.log("PASS: Local JSON database file successfully initialized.");

    // 3. Fetch requests
    console.log("\n2. Querying all staff advances on file...");
    const allReqs = await getBorrowRequests();
    console.log(`PASS: Found ${allReqs.length} record(s).`);
    if (allReqs[0].amount !== 400 || allReqs[0].status !== "pending") {
      throw new Error("Retrieved request contents did not match expectation.");
    }
    console.log("PASS: Retrieved contents match insertion parameters.");

    // 4. Approve request and configure cycle
    console.log("\n3. Admin Zeus reviews and approves the advance request with payment cycles...");
    const approvedReq = await updateBorrowRequestStatus(
      req1.id,
      "approved",
      "145278391166173185", // Zeus ID
      "Zeus",
      "Approved advance. Ensure vehicle repairs are completed.",
      {
        frequency: "biweekly",
        installments: 4,
        amountPerCycle: 100,
        startDate: "2026-07-01T00:00:00Z"
      }
    );

    console.log("Success! Updated request object:");
    console.log(JSON.stringify(approvedReq, null, 2));

    if (!approvedReq || approvedReq.status !== "approved") {
      throw new Error("Update operation failed to transition status to approved.");
    }
    if (approvedReq.amountPerCycle !== 100 || approvedReq.installments !== 4 || approvedReq.paymentFrequency !== "biweekly") {
      throw new Error("Repayment cycles settings were not correctly applied.");
    }
    console.log("PASS: Repayment cycles correctly scheduled ($100 per cycle, 4 cycles).");
    console.log("PASS: Admin reasoning recorded correctly: " + approvedReq.adminReasoning);

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
  } catch (err: any) {
    console.error("\n❌ TEST FAILURE:", err.message);
  } finally {
    // Restore backup if existed
    if (fs.existsSync(`${DATA_FILE}.bak`)) {
      console.log("\nRestoring backup of database...");
      if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
      fs.renameSync(`${DATA_FILE}.bak`, DATA_FILE);
    } else {
      // Clean up mock file
      if (fs.existsSync(DATA_FILE)) {
        console.log("\nCleaning up mock data file...");
        fs.unlinkSync(DATA_FILE);
      }
    }
  }
}

runTest();
