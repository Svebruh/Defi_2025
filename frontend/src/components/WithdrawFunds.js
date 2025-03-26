// src/WithdrawFunds.js
import { Box, Button, Typography } from "@mui/material";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";

function WithdrawFunds({ marketContract, account }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState("0");

  // Fetch the pending withdrawal amount for the connected account
  const fetchPendingWithdrawal = async () => {
    if (!marketContract || !account) return;
    try {
      const amount = await marketContract.pendingWithdrawals(account);
      setPending(ethers.formatEther(amount));
    } catch (error) {
      console.error("Error fetching pending withdrawal:", error);
    }
  };

  const handleWithdraw = async () => {
    if (!marketContract) return;
    try {
      setStatus("Withdrawing funds...");
      const tx = await marketContract.withdraw();
      await tx.wait();
      setStatus("Withdrawal successful!");
      // Refresh the pending withdrawal balance after withdrawal.
      fetchPendingWithdrawal();
    } catch (error) {
      console.error("Withdrawal error:", error);
      setStatus("Withdrawal failed.");
    }
  };

  useEffect(() => {
    if (!marketContract) return;

    // Create a filter for all Sale events. You can pass nulls to capture all events.
    const saleFilter = marketContract.filters.Sale(null, null, null, null);

    // Define the event handler
    const handleSale = (buyer, nftAddress, tokenId, price, event) => {
      console.log("Sale event detected:");
      console.log("Buyer:", buyer);
      console.log("NFT Address:", nftAddress);
      console.log("Token ID:", tokenId.toString());
      console.log("Price:", ethers.formatEther(price), "ETH");
      fetchPendingWithdrawal();
    };

    // Attach the event listener
    marketContract.on(saleFilter, handleSale);
    // Clean up the event listener on unmount or when marketContract changes
    return () => {
      marketContract.off(saleFilter, handleSale);
    };
  }, [marketContract]);

  return (
    <Box>
      <Typography variant="body1" align="left" sx={{ mb: 2 }}>
        Pending Withdrawal: {pending} ETH
      </Typography>
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
