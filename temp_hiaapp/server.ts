import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import sharp from "sharp";

import { db } from "./src/db/index";
import { users, messages, conversations, photos, photoUnlocks, favorites, blocks } from "./src/db/schema";
import { eq, or, and, sql, ne, notInArray } from "drizzle-orm";

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

      // Create a welcome conversation from "hia"
      try {
        // Find or create system user
        let systemUser = await db.select().from(users).where(eq(users.email, 'system@hia.app'));
        if (systemUser.length === 0) {
          systemUser = await db.insert(users).values({
            email: 'system@hia.app',
            displayName: 'hia',
            profilePhotoUrl: 'https://picsum.photos/seed/hia/400/400',
          }).returning();
        }

        const [newConv] = await db.insert(conversations).values({
          user1Id: systemUser[0].id,
          user2Id: newUser[0].id,
        }).returning();

        await db.insert(messages).values({
          conversationId: newConv.id,
          senderId: systemUser[0].id,
          content: "Welcome to hia! We're glad you're here. Start exploring nearby profiles and make some connections.",
        });
      } catch (err) {
        console.error("Failed to create welcome conversation:", err);
      }

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
      // Update lastSeen
      await db.update(users).set({ lastSeen: new Date(), isOnline: true }).where(eq(users.id, req.user.id));

      const user = await db.select().from(users).where(eq(users.id, req.user.id));
      if (user.length === 0) return res.status(404).json({ error: "User not found" });
      
      const userPhotos = await db.select().from(photos)
        .where(eq(photos.userId, req.user.id))
        .orderBy(sql`${photos.displayOrder} ASC`);

      res.json({ ...user[0], photos: userPhotos });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
  });

  // Helper for distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // User Routes
  apiRouter.get("/users", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await db.select().from(users).where(eq(users.id, req.user.id));
      
      // Get blocked users
      const blockedByUser = await db.select({ id: blocks.blockedUserId }).from(blocks).where(eq(blocks.userId, req.user.id));
      const blockedByOthers = await db.select({ id: blocks.userId }).from(blocks).where(eq(blocks.blockedUserId, req.user.id));
      const blockedIds = [...blockedByUser, ...blockedByOthers].map(b => b.id);

      let query = db.select().from(users);
      if (blockedIds.length > 0) {
        query = query.where(notInArray(users.id, blockedIds)) as any;
      }
      
      const allUsers = await query;
      
      const results = allUsers.map(u => {
        let distanceStr = "";
        let distanceValue = Infinity;
        
        if (currentUser[0]?.latitude != null && currentUser[0]?.longitude != null && u.latitude != null && u.longitude != null) {
          const dist = calculateDistance(
            Number(currentUser[0].latitude), Number(currentUser[0].longitude),
            Number(u.latitude), Number(u.longitude)
          );
          distanceValue = dist;
          
          if (dist < 0.1) {
            distanceStr = `${Math.round(dist * 5280)} feet`;
          } else {
            distanceStr = `${dist.toFixed(1)} mi`;
          }
        }
        return { ...u, distance: distanceStr, distanceValue };
      });

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
  });

  apiRouter.post("/users/location", authenticateToken, async (req: any, res) => {
    try {
      const { latitude, longitude } = req.body;
      await db.update(users)
        .set({ latitude, longitude, lastSeen: new Date(), isOnline: true })
        .where(eq(users.id, req.user.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update location", details: error.message });
    }
  });

  apiRouter.post("/users/heartbeat", authenticateToken, async (req: any, res) => {
    try {
      await db.update(users)
        .set({ lastSeen: new Date(), isOnline: true })
        .where(eq(users.id, req.user.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update heartbeat" });
    }
  });

  apiRouter.get("/users/:id", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userResult = await db.select().from(users).where(eq(users.id, userId));
      if (userResult.length === 0) return res.status(404).json({ error: "User not found" });
      
      const userProfile = userResult[0];

      // Fetch photos
      const userPhotos = await db.select().from(photos)
        .where(eq(photos.userId, userId))
        .orderBy(sql`${photos.displayOrder} ASC`);

      // Check if photos are unlocked for the current user
      const unlockStatus = await db.select().from(photoUnlocks)
        .where(and(
          eq(photoUnlocks.photoOwnerId, userId),
          eq(photoUnlocks.unlockedForUserId, req.user.id)
        ));

      const isUnlocked = unlockStatus.length > 0 || req.user.id === userId;
      
      // Check if current user has unlocked their gallery for this user
      const myUnlockStatus = await db.select().from(photoUnlocks)
        .where(and(
          eq(photoUnlocks.photoOwnerId, req.user.id),
          eq(photoUnlocks.unlockedForUserId, userId)
        ));
      const isMyGalleryUnlockedForThem = myUnlockStatus.length > 0;
      
      // Check if favorited
      const favStatus = await db.select().from(favorites)
        .where(and(
          eq(favorites.userId, req.user.id),
          eq(favorites.favoriteUserId, userId)
        ));
      const isFavorited = favStatus.length > 0;

      // Calculate distance if not already done by the /users endpoint logic
      const currentUser = await db.select().from(users).where(eq(users.id, req.user.id));
      let distanceStr = "";
      let distanceValue = Infinity;
      
      if (currentUser[0]?.latitude != null && currentUser[0]?.longitude != null && userProfile.latitude != null && userProfile.longitude != null) {
        const dist = calculateDistance(
          Number(currentUser[0].latitude), Number(currentUser[0].longitude),
          Number(userProfile.latitude), Number(userProfile.longitude)
        );
        distanceValue = dist;
        distanceStr = dist < 0.1 ? `${Math.round(dist * 5280)} feet` : `${dist.toFixed(1)} mi`;
      }

      res.json({
        ...userProfile,
        distance: distanceStr,
        distanceValue,
        photos: userPhotos,
        isUnlocked,
        isMyGalleryUnlockedForThem,
        isFavorited
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
  });

  apiRouter.post("/users/:id/unlock", authenticateToken, async (req: any, res) => {
    try {
      const photoOwnerId = req.user.id;
      const unlockedForUserId = parseInt(req.params.id);

      // Check if already unlocked
      const existing = await db.select().from(photoUnlocks)
        .where(and(
          eq(photoUnlocks.photoOwnerId, photoOwnerId),
          eq(photoUnlocks.unlockedForUserId, unlockedForUserId)
        ));

      if (existing.length === 0) {
        await db.insert(photoUnlocks).values({
          photoOwnerId,
          unlockedForUserId,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to unlock photos", details: error.message });
    }
  });

  // Favorites & Blocks
  apiRouter.post("/users/:id/favorite", authenticateToken, async (req: any, res) => {
    try {
      const favoriteUserId = parseInt(req.params.id);
      const existing = await db.select().from(favorites)
        .where(and(eq(favorites.userId, req.user.id), eq(favorites.favoriteUserId, favoriteUserId)));
      
      if (existing.length > 0) {
        await db.delete(favorites).where(and(eq(favorites.userId, req.user.id), eq(favorites.favoriteUserId, favoriteUserId)));
        return res.json({ success: true, favorited: false });
      } else {
        await db.insert(favorites).values({ userId: req.user.id, favoriteUserId });
        return res.json({ success: true, favorited: true });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Failed to favorite user" });
    }
  });

  apiRouter.post("/users/:id/block", authenticateToken, async (req: any, res) => {
    try {
      const blockedUserId = parseInt(req.params.id);
      await db.insert(blocks).values({ userId: req.user.id, blockedUserId });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  apiRouter.get("/favorites", authenticateToken, async (req: any, res) => {
    try {
      const favs = await db.select({ favoriteUserId: favorites.favoriteUserId }).from(favorites).where(eq(favorites.userId, req.user.id));
      const favIds = favs.map(f => f.favoriteUserId);
      if (favIds.length === 0) return res.json([]);
      
      const favUsers = await db.select().from(users).where(sql`${users.id} IN (${sql.join(favIds, sql`, `)})`);
      res.json(favUsers);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch favorites" });
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
  apiRouter.get("/conversations", authenticateToken, async (req: any, res) => {
    try {
      const userConversations = await db.select({
        id: conversations.id,
        user1Id: conversations.user1Id,
        user2Id: conversations.user2Id,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(or(
        eq(conversations.user1Id, req.user.id),
        eq(conversations.user2Id, req.user.id)
      ));

      const results = await Promise.all(userConversations.map(async (conv) => {
        const otherUserId = conv.user1Id === req.user.id ? conv.user2Id : conv.user1Id;
        const otherUser = await db.select().from(users).where(eq(users.id, otherUserId!));
        
        const lastMsg = await db.select().from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(sql`${messages.createdAt} DESC`)
          .limit(1);

        const unreadCount = await db.select({ count: sql`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.conversationId, conv.id),
            eq(messages.isRead, false),
            eq(messages.senderId, otherUserId!)
          ));

        return {
          ...conv,
          otherUser: otherUser[0],
          lastMessage: lastMsg[0] || null,
          unreadCount: parseInt((unreadCount[0] as any).count) || 0,
        };
      }));

      // Sort by last message or updated at
      results.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt!).getTime();
        const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt!).getTime();
        return timeB - timeA;
      });

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch conversations", details: error.message });
    }
  });

  apiRouter.get("/conversations/user/:otherUserId", authenticateToken, async (req: any, res) => {
    try {
      const otherUserId = parseInt(req.params.otherUserId);
      const currentUserId = req.user.id;

      // Check if conversation exists
      let conv = await db.select().from(conversations)
        .where(or(
          and(eq(conversations.user1Id, currentUserId), eq(conversations.user2Id, otherUserId)),
          and(eq(conversations.user1Id, otherUserId), eq(conversations.user2Id, currentUserId))
        ));

      if (conv.length === 0) {
        // Create new conversation
        const [newConv] = await db.insert(conversations).values({
          user1Id: currentUserId,
          user2Id: otherUserId,
        }).returning();
        return res.json(newConv);
      }

      res.json(conv[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to find or create conversation", details: error.message });
    }
  });

  apiRouter.get("/messages/:conversationId", authenticateToken, async (req, res) => {
    try {
      const conversationMessages = await db.select().from(messages)
        .where(eq(messages.conversationId, parseInt(req.params.conversationId)));
      res.json(conversationMessages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch messages", details: error.message });
    }
  });

  apiRouter.post("/messages/read/:conversationId", authenticateToken, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const currentUserId = req.user.id;

      await db.update(messages)
        .set({ isRead: true })
        .where(and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, currentUserId),
          eq(messages.isRead, false)
        ));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to mark messages as read", details: error.message });
    }
  });

  apiRouter.post("/messages", authenticateToken, async (req: any, res) => {
    try {
      // Update lastSeen for sender
      await db.update(users).set({ lastSeen: new Date(), isOnline: true }).where(eq(users.id, req.user.id));
      const newMessage = await db.insert(messages).values(req.body).returning();
      res.json(newMessage[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to send message", details: error.message });
    }
  });

  apiRouter.post("/photos", authenticateToken, async (req: any, res) => {
    try {
      const { photoData, isLocked, displayOrder } = req.body;
      const [newPhoto] = await db.insert(photos).values({
        userId: req.user.id,
        photoData,
        isLocked: isLocked || false,
        displayOrder: displayOrder || 0
      }).returning();
      res.json(newPhoto);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save photo", details: error.message });
    }
  });

  apiRouter.delete("/photos/:id", authenticateToken, async (req: any, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const [photo] = await db.select().from(photos).where(and(eq(photos.id, photoId), eq(photos.userId, req.user.id)));
      
      if (!photo) return res.status(404).json({ error: "Photo not found" });

      // Extract filename from URL
      const url = new URL(photo.photoData);
      const fileName = url.pathname.split('/').pop();
      
      if (fileName) {
        const bucketName = process.env.R2_BUCKET_NAME || "hia-images";
        try {
          await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: fileName }));
          // Also try to delete thumbnail
          const thumbName = fileName.replace('.webp', '-thumb.webp');
          await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: thumbName }));
        } catch (err) {
          console.error("Failed to delete from R2:", err);
        }
      }

      await db.delete(photos).where(eq(photos.id, photoId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete photo", details: error.message });
    }
  });

  apiRouter.delete("/users/me/profile-photo", authenticateToken, async (req: any, res) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
      if (!user || !user.profilePhotoUrl) return res.status(404).json({ error: "No profile photo found" });

      const url = new URL(user.profilePhotoUrl);
      const fileName = url.pathname.split('/').pop();

      if (fileName) {
        const bucketName = process.env.R2_BUCKET_NAME || "hia-images";
        try {
          await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: fileName }));
          if (user.profilePhotoThumbUrl) {
            const thumbUrl = new URL(user.profilePhotoThumbUrl);
            const thumbName = thumbUrl.pathname.split('/').pop();
            if (thumbName) {
              await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: thumbName }));
            }
          }
        } catch (err) {
          console.error("Failed to delete from R2:", err);
        }
      }

      await db.update(users).set({ profilePhotoUrl: null, profilePhotoThumbUrl: null }).where(eq(users.id, req.user.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete profile photo", details: error.message });
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
