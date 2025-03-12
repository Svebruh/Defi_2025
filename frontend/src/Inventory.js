// src/Inventory.js
import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";

function Inventory({ nftContract, account }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInventory = async () => {
    if (!nftContract || !account) return;
    setLoading(true);
    try {
      const balance = await nftContract.balanceOf(account);
      const tokenIds = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
        tokenIds.push(tokenId.toString());
      }
      const tokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const tokenURI = await nftContract.tokenURI(tokenId);
          return { tokenId, tokenURI };
        })
      );
      setCards(tokens);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, [nftContract, account]);

  return (
    <Box>
      {loading && <Typography>Loading inventory...</Typography>}
        {!loading && cards.length === 0 && (
          <Typography>You don’t own any cards yet.</Typography>
        )}
        {!loading && cards.length > 0 && (
          <ul>
            {cards.map((card, index) => (
              <li key={index}>
                <Typography variant="body1">
                  <strong>Token ID:</strong> {card.tokenId}
                </Typography>
                <Typography variant="body2">
                  <strong>Metadata:</strong> {card.tokenURI}
                </Typography>
              </li>
            ))}
          </ul>
        )}
        <Button variant="contained" onClick={fetchInventory}>
          Refresh Inventory
        </Button>
    </Box> 
  );
}

export default Inventory;
