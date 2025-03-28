import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { parseEther } from "ethers";
import React, { useEffect, useState } from "react";

function FixedPriceListingItem({
  listing,
  marketContract,
  refreshListings,
  nftContract,
}) {
  const [status, setStatus] = useState("");
  const [metadata, setMetadata] = useState(null);

  // Fetch the NFT metadata for this token
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!nftContract || !listing) return;
      try {
        const tokenURI = await nftContract.tokenURI(listing.tokenId);
        const response = await fetch(tokenURI);
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        console.error("Error loading NFT metadata:", error);
      }
    };
    fetchMetadata();
  }, [nftContract, listing]);

  const handleBuy = async () => {
    try {
      setStatus("Processing purchase...");
      const tx = await marketContract.buyItem(listing.tokenId, {
        value: parseEther(listing.price),
      });
      await tx.wait();
      setStatus("Purchase successful!");
      refreshListings();
    } catch (error) {
      console.error("Error buying item:", error);
      setStatus("Purchase failed.");
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        border: "1px solid #444",
        borderRadius: 2,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Display the NFT image if available */}
          {metadata?.image ? (
            <img
              src={metadata.image}
              alt={metadata.name || `Token #${listing.tokenId}`}
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
            <Typography variant="subtitle1">
              <strong>Token ID:</strong> {listing.tokenId}
            </Typography>
            <Typography variant="body2">
              <strong>Seller:</strong> {listing.seller}
            </Typography>
            <Typography variant="body2">
              <strong>Price:</strong> {listing.price} ETH
            </Typography>
          </Box>
        </Box>

        <Button variant="contained" onClick={handleBuy} sx={{ mt: 2 }}>
          Buy NFT
        </Button>
        {status && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {status}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default FixedPriceListingItem;
