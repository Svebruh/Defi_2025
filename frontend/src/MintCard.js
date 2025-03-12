// src/MintCard.js
import React, { useState } from "react";
import { Card, CardContent, CardActions, Typography, Button, Box } from "@mui/material";

function MintCard({ nftContract, account }) {
  const [status, setStatus] = useState("");

  const cards = [
    {
      name: "Pikachu",
      tokenURI: "/metadata/pikachu.json",
    },
    {
      name: "Charmander",
      tokenURI: "/metadata/charmander.json",
    },
    {
      name: "Bulbasaur",
      tokenURI: "/metadata/bulbasaur.json",
    },
  ];

  const mintCard = async (tokenURI) => {
    if (!nftContract || !account) {
      alert("Contract instance or account not found.");
      return;
    }
    try {
      setStatus("Minting...");
      const tx = await nftContract.mint(account, tokenURI);
      await tx.wait();
      setStatus("Minting successful!");
    } catch (error) {
      console.error("Error minting card:", error);
      setStatus("Minting failed.");
    }
  };

  return (
    <Box>
      {status && (
        <Typography variant="body1" sx={{ mb: 2 }}>
          Status: {status}
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 2 }}>
        {cards.map((card, index) => (
          <Button
            key={index}
            variant="contained"
            onClick={() => mintCard(card.tokenURI)}
          >
            Mint {card.name}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

export default MintCard;
