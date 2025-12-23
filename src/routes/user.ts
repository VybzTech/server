import { Router } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "@/lib/logger.js";

export const userRoutes = Router();

// ==========================================
// GET /api/users/me
// Get current user
// ==========================================
userRoutes.get("/me", (req: AuthRequest, res: Response) => {
  try {
    logger.info("[User.me] Fetching current user");
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch user",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ==========================================
// POST /api/users/profile
// Update user profile
// ==========================================
userRoutes.post(
  "/profile",
  async (req: AuthRequest, res: Response) => {
    try {
      logger.info("[User.updateProfile] Updating profile:", req.userId);

      const data = z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          bio: z.string().optional(),
          gender: z.string().optional(),
          phone: z.string().optional(),
          dateOfBirth: z.string().optional(),
        })
        .parse(req.body);

      const updated = await prisma.user.update({
        where: { id: req.userId },
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth)
            : undefined,
        },
      });

      logger.success("[User.updateProfile] Profile updated");

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updated,
      });
    } catch (error) {
      logger.error("[User.updateProfile] Error:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Failed to update profile",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
