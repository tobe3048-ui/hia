import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import sharp from "sharp";

import { db } from "./src/db/index";
import { users, messages, conversations } from "./src/db/schema";
import { eq, or, and } from "drizzle-orm";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return secret || "hia-dev-secret-key-change-me";
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// R2 Configuration
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiRouter = express.Router();

  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok", message: "hia backend is running" });
  });

  // Auth Routes
  apiRouter.get("/auth/check-email", async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: "Email is required" });
      const user = await db.select().from(users).where(eq(users.email, email as string));
      res.json({ exists: user.length > 0 });
    } catch (error: any) {
      res.status(500).json({ error: "Email check failed", details: error.message });
    }
  });

  apiRouter.post("/auth/register", async (req, res) => {
    try {
      const { email, password: passwordRaw, displayName, ...rest } = req.body;
      const hashedPassword = await bcrypt.hash(passwordRaw, 10);
      const newUser = await db.insert(users).values({
        email,
        password: hashedPassword,
        displayName,
        ...rest
      }).returning();
      
      const token = jwt.sign({ id: newUser[0].id, email: newUser[0].email }, getJwtSecret());
      res.json({ user: newUser[0], token });
    } catch (error: any) {
      res.status(500).json({ error: "Registration failed", details: error.message });
    }
  });

  apiRouter.post("/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.select().from(users).where(eq(users.email, email));
      
      if (user.length === 0) return res.status(401).json({ error: "Invalid credentials" });
      
      const validPassword = await bcrypt.compare(password, user[0].password || "");
      if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });
      
      const token = jwt.sign({ id: user[0].id, email: user[0].email }, getJwtSecret());
      res.json({ user: user[0], token });
    } catch (error: any) {
      res.status(500).json({ error: "Login failed", details: error.message });
    }
  });

  apiRouter.get("/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, req.user.id));
      if (user.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(user[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
  });

  // User Routes
  apiRouter.get("/users", authenticateToken, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
  });

  apiRouter.get("/users/:id", authenticateToken, async (req, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, parseInt(req.params.id)));
      if (user.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(user[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
  });

  apiRouter.post("/users/me", authenticateToken, async (req: any, res) => {
    try {
      const { id, email, password, ...updateData } = req.body;
      const updatedUser = await db.update(users)
        .set(updateData)
        .where(eq(users.id, req.user.id))
        .returning();
      res.json(updatedUser[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update profile", details: error.message });
    }
  });

  // Message Routes
  apiRouter.get("/messages/:conversationId", authenticateToken, async (req, res) => {
    try {
      const conversationMessages = await db.select().from(messages)
        .where(eq(messages.conversationId, parseInt(req.params.conversationId)));
      res.json(conversationMessages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch messages", details: error.message });
    }
  });

  apiRouter.post("/messages", authenticateToken, async (req, res) => {
    try {
      const newMessage = await db.insert(messages).values(req.body).returning();
      res.json(newMessage[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to send message", details: error.message });
    }
  });

  apiRouter.post("/upload/delete", async (req, res) => {
    try {
      const { fileName, thumbFileName } = req.body;
      if (!fileName) return res.status(400).json({ error: "No file name provided" });

      const bucketName = process.env.R2_BUCKET_NAME || "hia-images";

      // Delete main image
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        })
      );

      // Delete thumbnail if it exists
      if (thumbFileName) {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: thumbFileName,
          })
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("R2 Delete Error:", error);
      res.status(500).json({ error: "Failed to delete from R2", details: error.message });
    }
  });

  apiRouter.post("/upload", upload.single("file"), async (req, res) => {
    console.log("Upload request received");
    if (!process.env.R2_PUBLIC_URL) {
      console.warn("R2_PUBLIC_URL is not set. Using default fallback URL which may not work for your bucket.");
    }
    try {
      if (!req.file) {
        console.log("No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }
      console.log("File received:", req.file.originalname, req.file.size);

      const bucketName = process.env.R2_BUCKET_NAME || "hia-images";
      const baseFileName = crypto.randomBytes(16).toString("hex");

      // Process main image
      const processedBuffer = await sharp(req.file.buffer)
        .resize({
          width: 1000,
          height: 1250,
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: 75 })
        .toBuffer();

      const mainFileName = `${baseFileName}.webp`;

      // Process thumbnail
      const thumbBuffer = await sharp(req.file.buffer)
        .resize(300, 375, {
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: 70 })
        .toBuffer();

      const thumbFileName = `${baseFileName}-thumb.webp`;

      // Upload main image
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: mainFileName,
          Body: processedBuffer,
          ContentType: "image/webp",
        })
      );

      // Upload thumbnail
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: thumbFileName,
          Body: thumbBuffer,
          ContentType: "image/webp",
        })
      );

      const publicUrlBase = (process.env.R2_PUBLIC_URL || `https://pub-d5ffaf6b3633db5a7f3ee06746d39639.r2.dev`).replace(/\/$/, "");

      const publicUrl = `${publicUrlBase}/${mainFileName}`;
      const thumbUrl = `${publicUrlBase}/${thumbFileName}`;

      console.log("Upload successful:", { publicUrl, thumbUrl });

      res.json({ 
        url: publicUrl, 
        thumbUrl: thumbUrl,
        fileName: mainFileName,
        thumbFileName: thumbFileName
      });
    } catch (error: any) {
      console.error("R2 Upload Error:", error);
      res.status(500).json({ error: "Failed to upload to R2", details: error.message });
    }
  });

  apiRouter.use("*", (req, res) => {
    console.log(`API 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "API route not found" });
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
