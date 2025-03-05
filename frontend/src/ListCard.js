// src/ListCard.js
import React, { useState } from "react";
import { ethers, parseEther } from "ethers";

function ListCard({ marketContract }) {
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [isAuction, setIsAuction] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!marketContract) {
      setStatus("Marketplace contract not loaded");
      return;
    }

    try {
      setStatus("Listing card...");
      // Convert price from ETH to wei
      const priceInWei = parseEther(price);
      // Call listItem on the marketplace contract.
      // Ensure that the NFT has been approved for transfer by this contract.
      const tx = await marketContract.listItem(
        tokenId,
        priceInWei,
        isAuction,
        isAuction ? auctionDuration : 0 // if not auction, pass 0 for duration
      );
      await tx.wait();
      setStatus("Card listed successfully!");
    } catch (error) {
      console.error("Error listing card:", error);
      setStatus("Error listing card.");
    }
  };

  return (
    <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc" }}>
      <h2>List Your Card</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>
            Token ID:{" "}
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>
            Price (in ETH):{" "}
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>
            Auction Mode:{" "}
            <input
              type="checkbox"
              checked={isAuction}
              onChange={(e) => setIsAuction(e.target.checked)}
            />
          </label>
        </div>
        {isAuction && (
          <div style={{ marginBottom: "10px" }}>
            <label>
              Auction Duration (seconds):{" "}
              <input
                type="text"
                value={auctionDuration}
                onChange={(e) => setAuctionDuration(e.target.value)}
                required={isAuction}
              />
            </label>
          </div>
        )}
        <button type="submit">List Card</button>
      </form>
      {status && <p>Status: {status}</p>}
    </div>
  );
}

export default ListCard;
