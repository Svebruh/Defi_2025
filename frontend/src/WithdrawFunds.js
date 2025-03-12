// src/WithdrawFunds.js
import React, { useState } from "react";
import { Paper, Typography, Button, Box } from "@mui/material";

function WithdrawFunds({ marketContract }) {
  const [status, setStatus] = useState("");

  const handleWithdraw = async () => {
    if (!marketContract) return;
    try {
      setStatus("Withdrawing funds...");
      const tx = await marketContract.withdraw();
      await tx.wait();
      setStatus("Withdrawal successful!");
    } catch (error) {
      console.error("Withdrawal error:", error);
      setStatus("Withdrawal failed.");
    }
  };

  return (
    <Box>
       <Box textAlign="center">
          <Button variant="contained" onClick={handleWithdraw}>
            Withdraw Funds
          </Button>
        </Box>
        {status && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 1 }}
          >
            {status}
          </Typography>
        )}
    </Box>
  );
}

export default WithdrawFunds;
