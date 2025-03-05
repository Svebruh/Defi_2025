// src/MintCard.js
import React, { useState } from "react";
import { ethers } from "ethers";

function MintCard({ nftContract, account }) {
  const [status, setStatus] = useState("");

  // Define metadata for three different Pokémon cards.
  // In a real project, these tokenURI values should point to your hosted JSON metadata.
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
      // Call the mint function on your NFT contract.
      // This function is secured with onlyOwner, so the connected account must be the owner.
      const tx = await nftContract.mint(account, tokenURI);
      await tx.wait();
      setStatus("Minting successful!");
    } catch (error) {
      console.error("Error minting card:", error);
      setStatus("Minting failed.");
    }
  };

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", marginTop: "20px" }}>
      <h2>Mint Pokémon Cards</h2>
      {status && <p>Status: {status}</p>}
      {cards.map((card, index) => (
        <div key={index} style={{ marginBottom: "10px" }}>
          <p>
            <strong>{card.name}</strong>
          </p>
          <button onClick={() => mintCard(card.tokenURI)}>Mint {card.name}</button>
        </div>
      ))}
    </div>
  );
}

export default MintCard;
