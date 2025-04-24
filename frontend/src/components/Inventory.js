// src/Inventory.js
import { Box, Button, Typography } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";

function Inventory({ nftContract, account }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch the inventory of NFTs owned by the connected account
  const fetchInventory = useCallback(async () => {
    if (!nftContract || !account) return;
    setLoading(true);
    try {
      const balance = await nftContract.balanceOf(account);
      const tokenIds = [];
      for (let i = 0; i < balance; i++) {
        const tokenIdBN = await nftContract.tokenOfOwnerByIndex(account, i);
        tokenIds.push(tokenIdBN.toString());
      }
      const tokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const tokenURI = await nftContract.tokenURI(tokenId);
          let metadata = null;
          try {
            const response = await fetch(tokenURI);
            metadata = await response.json();
          } catch (err) {
            console.error("Error fetching metadata:", err);
          }
          return { tokenId, tokenURI, metadata };
        })
      );
      setCards(tokens);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
    setLoading(false);
  }, [nftContract, account]);

  // Initial load & update on dependency changes
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Listen for Transfer events to trigger a refresh automatically.
  useEffect(() => {
    if (!nftContract || !account) return;

    // Listen for incoming transfers (mint or received NFT)
    const filterIn = nftContract.filters.Transfer(null, account);
    // Listen for outgoing transfers (NFT sent away)
    const filterOut = nftContract.filters.Transfer(account, null);

    nftContract.on(filterIn, fetchInventory);
    nftContract.on(filterOut, fetchInventory);

    return () => {
      nftContract.off(filterIn, fetchInventory);
      nftContract.off(filterOut, fetchInventory);
    };
  }, [nftContract, account, fetchInventory]);

  return (
    <Box>
      {loading && <Typography>Loading inventory...</Typography>}
      {!loading && cards.length === 0 && (
        <Typography>You don’t own any cards yet.</Typography>
      )}

      {!loading && cards.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {cards.map((card, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                border: "1px solid #444",
                p: 2,
                borderRadius: 2,
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {card.metadata?.image ? (
                <img
                  src={card.metadata.image}
                  alt={card.metadata.name || `Token #${card.tokenId}`}
                  style={{ width: "80px", borderRadius: "8px" }}
                />
              ) : (
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    backgroundColor: "#333",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="caption">No Image</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="body1">
                  <strong>Token ID:</strong> {card.tokenId}
                </Typography>
                <Typography variant="body2">
                  <strong>Metadata URI:</strong> {card.tokenURI}
                </Typography>
                {card.metadata?.name && (
                  <Typography variant="body2">
                    <strong>Name:</strong> {card.metadata.name}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <Box textAlign="center" sx={{ mt: 0 }}>
        <Button variant="contained" onClick={fetchInventory} sx={{ mt: 2 }}>
          Refresh Inventory
        </Button>
      </Box>
    </Box>
  );
}

export default Inventory;
