// src/Inventory.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

function Inventory({ nftContract, account }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInventory = async () => {
    if (!nftContract || !account) return;
    setLoading(true);
    try {
      // Get the number of tokens owned by the account.
      const balance = await nftContract.balanceOf(account);
      const tokenIds = [];
      // Loop through each token index and fetch the token ID.
      for (let i = 0; i < balance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
        tokenIds.push(tokenId.toString());
      }

      // Retrieve metadata for each token.
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
    <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc" }}>
      <h2>My Inventory</h2>
      {loading ? (
        <p>Loading inventory...</p>
      ) : cards.length === 0 ? (
        <p>You don’t own any cards yet.</p>
      ) : (
        <ul>
          {cards.map((card, index) => (
            <li key={index}>
              <p>
                <strong>Token ID:</strong> {card.tokenId}
              </p>
              <p>
                <strong>Metadata:</strong>{" "}
                <a href={card.tokenURI} target="_blank" rel="noopener noreferrer">
                  {card.tokenURI}
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
      <button onClick={fetchInventory}>Refresh Inventory</button>
    </div>
  );
}

export default Inventory;
