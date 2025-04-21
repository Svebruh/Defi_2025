// src/PauseControls.js
import React, { useEffect, useState } from "react";
import { Button, Box, Typography } from "@mui/material";

export default function PauseControls({ marketContract, account }) {
  const [isOwner, setIsOwner] = useState(false);
  const [paused, setPaused] = useState(false);

  // Check if current account is contract owner, and get paused state
  useEffect(() => {
    if (!marketContract || !account) return;
    (async () => {
      const owner = await marketContract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());
      const isPaused = await marketContract.paused();
      setPaused(isPaused);
    })();
  }, [marketContract, account]);

  const handlePause = async () => {
    await marketContract.pause();
    setPaused(true);
  };
  const handleUnpause = async () => {
    await marketContract.unpause();
    setPaused(false);
  };

  if (!isOwner) return null; // only show to owner

  return (
    <Box sx={{ my: 2, textAlign: "center" }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Contract is currently <strong>{paused ? "PAUSED" : "ACTIVE"}</strong>
      </Typography>
      {paused ? (
        <Button variant="contained" color="secondary" onClick={handleUnpause}>
          Unpause Marketplace
        </Button>
      ) : (
        <Button variant="outlined" color="secondary" onClick={handlePause}>
          Pause Marketplace
        </Button>
      )}
    </Box>
  );
}
