import { Router } from "express";

export const propertyRoutes = Router();

propertyRoutes.get("/", async (req, res) => {
  res.json({
    success: true,
    message: "Properties endpoint - coming soon",
  });
});

propertyRoutes.post("/", async (req, res) => {
  res.status(201).json({
    success: true,
    message: "Create property endpoint - coming soon",
  });
});