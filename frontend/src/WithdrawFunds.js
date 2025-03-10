// src/WithdrawFunds.js
import React, { useState } from "react";

function WithdrawFunds({ marketContract }) {
  const [status, setStatus] = useState("");

  const handleWithdraw = async () => {
    if (!marketContract) return;
    try {
      setStatus("Withdrawing funds...");
      // Call the withdraw function on the marketplace contract
      const tx = await marketContract.withdraw();
      await tx.wait();
      setStatus("Withdrawal successful!");
    } catch (error) {
      console.error("Withdrawal error:", error);
      setStatus("Withdrawal failed.");
    }
  };

  return (
    <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc" }}>
      <h2>Withdraw Funds</h2>
      <button onClick={handleWithdraw}>Withdraw Funds</button>
      {status && <p>Status: {status}</p>}
    </div>
  );
}

export default WithdrawFunds;
