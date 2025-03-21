import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { parseEther } from "ethers";
import React, { useState } from "react";

function ListCard({ marketContract, nftContract, marketAddress }) {
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [isAuction, setIsAuction] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!marketContract || !nftContract) {
      setStatus("Contracts not loaded");
      return;
    }

    try {
      setStatus("Checking NFT approval...");
      const approvedAddress = await nftContract.getApproved(tokenId);
      if (approvedAddress.toLowerCase() !== marketAddress.toLowerCase()) {
        setStatus("Approving NFT for marketplace...");
        const approveTx = await nftContract.approve(marketAddress, tokenId);
        await approveTx.wait();
        setStatus("NFT approved. Proceeding with listing...");
      }

      const priceInWei = parseEther(price);
      const tx = await marketContract.listItem(
        tokenId,
        priceInWei,
        isAuction,
        isAuction ? auctionDuration : 0
      );
      await tx.wait();
      setStatus("Card listed successfully!");
    } catch (error) {
      console.error("Error listing card:", error);
      setStatus("Error listing card.");
    }
  };

  return (
    <Box>
      {status && <Typography sx={{ mb: 2 }}>Status: {status}</Typography>}
      <form onSubmit={handleSubmit}>
        <TextField
          label="Token ID"
          type="number"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          required
          sx={{ mb: 2, mr: 2 }}
        />
        {!isAuction && (
          <TextField
            label="Price (ETH)"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            sx={{ mb: 2, mr: 2 }}
          />
        )}
        <FormControlLabel
          control={
            <Checkbox
              checked={isAuction}
              onChange={(e) => setIsAuction(e.target.checked)}
            />
          }
          label="Auction Mode"
          sx={{ display: "block" }}
        />
        {isAuction && (
          <TextField
            label="Auction Duration (seconds)"
            type="number"
            value={auctionDuration}
            onChange={(e) => setAuctionDuration(e.target.value)}
            required
            sx={{ mb: 2, mr: 2 }}
          />
        )}
        <Button variant="contained" type="submit">
          List Card
        </Button>
      </form>
    </Box>
  );
}

export default ListCard;
