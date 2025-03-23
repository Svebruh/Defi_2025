import { Box, Button, Typography } from "@mui/material";
import React, { useState } from "react";

function MintCard({ nftContract, account }) {
  const [status, setStatus] = useState("");

  const cards = [
    {
      name: "Pikachu",
      tokenURI: "/TokenURI/Pikachu.json",
    },
    {
      name: "Charmander",
      tokenURI: "/TokenURI/Charmander.json",
    },
    {
      name: "Bulbasaur",
      tokenURI: "/TokenURI/Bulbasaur.json",
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
      // setStatus(`Minting failed: ${error.message}`);
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
