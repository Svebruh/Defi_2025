// src/components/Section.js
import React from "react";
import { Paper, Typography, Box } from "@mui/material";

function Section({ title, children }) {
  return (
    <Paper
      elevation={4}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,          // More rounded corners
        backgroundColor: "#F8F8F8", // Light gray background for the section
      }}
    >
      {title && (
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      <Box>{children}</Box>
    </Paper>
  );
}

export default Section;
